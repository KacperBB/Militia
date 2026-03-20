import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { geocodePolishCity } from "@/lib/location/geocode";
import { MAX_PRICE_CENTS } from "@/lib/posts/price";
import { isAllowedImageUrl, ALLOWED_IMAGE_HOSTS_LABEL } from "@/lib/posts/image-allowlist";
import { canEditListing, ownerEditRequiresReview } from "@/lib/posts/policies";
import { sanitizeSingleLine, sanitizeMultiline } from "@/lib/posts/sanitize";
import { POST_STATUSES } from "@/lib/posts/status";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";
import { hasEnoughPhoneDigits } from "@/lib/auth/validators";

function isGoogleMapsUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    return (
      hostname === "maps.google.com" ||
      hostname === "www.google.com" ||
      hostname === "www.google.pl" ||
      hostname === "maps.app.goo.gl" ||
      hostname === "goo.gl"
    );
  } catch {
    return false;
  }
}

const attributeValueSchema = z.object({
  attributeId: z.string().uuid(),
  valueText: z.string().trim().max(1000).optional(),
  valueNumber: z.number().optional(),
  valueBoolean: z.boolean().optional(),
  valueDate: z.string().datetime({ offset: true }).optional(),
  valueJson: z.array(z.string().trim().max(200)).optional(),
});

const updatePostSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(6000),
  categoryId: z.string().uuid(),
  priceCents: z.number().int().nonnegative().max(MAX_PRICE_CENTS).optional(),
  isNegotiable: z.boolean().optional(),
  useCompanyProfile: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
  contactName: z.string().trim().min(1).max(140).optional(),
  contactPhone: z
    .string()
    .trim()
    .min(7)
    .max(40)
    .regex(/^[0-9+\-\s()]{7,40}$/, "Invalid phone number format.")
    .refine(hasEnoughPhoneDigits, "Phone number must contain at least 7 digits.")
    .optional(),
  city: z.string().trim().min(2).max(120),
  googlePlaceId: z.string().trim().max(200).optional(),
  googleMapsUrl: z
    .string()
    .url()
    .max(500)
    .refine(isGoogleMapsUrl, "Only Google Maps URLs are allowed.")
    .optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  images: z.array(z.object({
    url: z
      .string()
      .url()
      .max(1000)
      .refine(isAllowedImageUrl, `Image URL must be from an allowed CDN: ${ALLOWED_IMAGE_HOSTS_LABEL}`),
    fileKey: z.string().trim().min(1).max(500),
    mimeType: z.string().trim().max(255).nullable().optional(),
    sizeBytes: z.number().int().nonnegative().nullable().optional(),
  })).max(10).optional(),
  attributeValues: z.array(attributeValueSchema).max(50).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  if (!assertJsonRequest(request)) {
    return badRequest("Content-Type must be application/json.");
  }

  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ message: "Account is not active." }, { status: 403 });
  }

  const { postId } = await params;
  const post = await db.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      created_by: true,
      status: true,
      slug: true,
      published_at: true,
      expires_at: true,
      is_promoted: true,
      deleted_at: true,
    },
  });

  if (!post || post.deleted_at) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  if (!canEditListing(post.created_by, session.user)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const parsedInput = updatePostSchema.safeParse(body);

  if (!parsedInput.success) {
    return NextResponse.json({ message: parsedInput.error.issues[0]?.message ?? "Invalid listing payload." }, { status: 400 });
  }

  const input = parsedInput.data;
  const normalizedTitle = sanitizeSingleLine(input.title);
  const normalizedDescription = sanitizeMultiline(input.description);
  const normalizedCity = sanitizeSingleLine(input.city);
  const normalizedContactName = input.contactName ? sanitizeSingleLine(input.contactName) : null;
  const normalizedContactPhone = input.contactPhone ? sanitizeSingleLine(input.contactPhone) : null;
  const hasInputCoordinates = Number.isFinite(input.lat) && Number.isFinite(input.lng);
  const fallbackCoordinates = hasInputCoordinates ? null : await geocodePolishCity(normalizedCity);
  const resolvedLat = hasInputCoordinates ? input.lat : fallbackCoordinates?.lat;
  const resolvedLng = hasInputCoordinates ? input.lng : fallbackCoordinates?.lng;

  const category = await db.categories.findUnique({
    where: { id: input.categoryId },
    select: { id: true, parent_id: true },
  });

  if (!category) {
    return NextResponse.json({ message: "Category not found." }, { status: 404 });
  }

  const inheritanceChain = [category.id];
  let currentParentId = category.parent_id;

  while (currentParentId) {
    inheritanceChain.unshift(currentParentId);
    const parentCategory = await db.categories.findUnique({
      where: { id: currentParentId },
      select: { parent_id: true },
    });
    currentParentId = parentCategory?.parent_id ?? null;
  }

  const rawCategoryAttributes = await db.category_attributes.findMany({
    where: { category_id: { in: inheritanceChain } },
    select: { id: true, category_id: true, name: true, slug: true, is_required: true },
  });

  const chainOrder = new Map(inheritanceChain.map((id, index) => [id, index]));
  const categoryAttributesBySlug = new Map<string, (typeof rawCategoryAttributes)[number]>();
  for (const attribute of rawCategoryAttributes.sort((left, right) => {
    const leftOrder = chainOrder.get(left.category_id) ?? 0;
    const rightOrder = chainOrder.get(right.category_id) ?? 0;
    return leftOrder - rightOrder;
  })) {
    categoryAttributesBySlug.set(attribute.slug, attribute);
  }

  const categoryAttributes = [...categoryAttributesBySlug.values()];
  const providedAttributeIds = new Set((input.attributeValues ?? []).map((v) => v.attributeId));
  const missingRequired = categoryAttributes.filter((attr) => attr.is_required && !providedAttributeIds.has(attr.id));
  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        message: `Missing required attributes: ${missingRequired.map((a) => a.name).join(", ")}.`,
        missingAttributes: missingRequired.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
      },
      { status: 400 },
    );
  }

  if ((input.attributeValues ?? []).length > 0) {
    const validAttributeIds = new Set(categoryAttributes.map((a) => a.id));
    const invalidIds = (input.attributeValues ?? []).filter((v) => !validAttributeIds.has(v.attributeId));
    if (invalidIds.length > 0) {
      return NextResponse.json({ message: "One or more attribute IDs do not belong to the selected category." }, { status: 400 });
    }
  }

  const reviewAfterEdit = ownerEditRequiresReview(post.created_by, session.user);

  const updated = await db.$transaction(async (tx) => {
    await tx.post_images.deleteMany({ where: { post_id: post.id } });
    await tx.post_attribute_values.deleteMany({ where: { post_id: post.id } });

    const result = await tx.posts.update({
      where: { id: post.id },
      data: {
        title: normalizedTitle,
        description: normalizedDescription,
        category_id: input.categoryId,
        company_id: input.useCompanyProfile ? session.user.company_id ?? null : null,
        price_cents: input.priceCents,
        is_negotiable: input.isNegotiable ?? false,
        auto_renew: input.autoRenew ?? false,
        contact_name: normalizedContactName,
        contact_phone: normalizedContactPhone,
        city: normalizedCity,
        lat: resolvedLat,
        lng: resolvedLng,
        status: reviewAfterEdit ? POST_STATUSES.DRAFT : post.status,
        published_at: reviewAfterEdit ? null : post.published_at,
        expires_at: reviewAfterEdit ? null : post.expires_at,
        images: input.images?.length
          ? {
              create: input.images.map((image, index) => ({
                storage_key: image.url,
                mime_type: image.mimeType ?? undefined,
                size_bytes: image.sizeBytes ?? undefined,
                sort_order: index,
              })),
            }
          : undefined,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { id: true, username: true, avatar_url: true } },
        images: { orderBy: { sort_order: "asc" }, select: { storage_key: true } },
      },
    });

    if (input.attributeValues?.length) {
      await tx.post_attribute_values.createMany({
        data: input.attributeValues.map((v) => ({
          post_id: post.id,
          attribute_id: v.attributeId,
          value_text: v.valueText ?? null,
          value_number: v.valueNumber !== undefined ? v.valueNumber : null,
          value_boolean: v.valueBoolean ?? null,
          value_date: v.valueDate ? new Date(v.valueDate) : null,
          value_json: v.valueJson !== undefined ? v.valueJson : undefined,
        })),
      });
    }

    return result;
  });

  return NextResponse.json(
    {
      message: reviewAfterEdit ? "Listing updated and moved back to draft." : "Listing updated successfully.",
      post: {
        id: updated.id,
        title: updated.title,
        city: updated.city,
        status: updated.status,
        priceCents: updated.price_cents,
        isNegotiable: updated.is_negotiable,
        autoRenew: updated.auto_renew,
        contactName: updated.contact_name,
        contactPhone: updated.contact_phone,
        category: updated.category,
        author: {
          id: updated.author.id,
          username: updated.author.username,
          avatarUrl: updated.author.avatar_url,
        },
        images: updated.images.map((image) => image.storage_key),
      },
    },
    { status: 200 },
  );
}