import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const attributeValueSchema = z.object({
  attributeId: z.string().uuid(),
  valueText: z.string().trim().max(1000).optional(),
  valueNumber: z.number().optional(),
  valueBoolean: z.boolean().optional(),
  valueDate: z.string().datetime({ offset: true }).optional(),
  valueJson: z.array(z.string().trim().max(200)).optional(),
});

const createPostSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(6000),
  categoryId: z.string().uuid(),
  priceCents: z.number().int().nonnegative().optional(),
  isNegotiable: z.boolean().optional(),
  useCompanyProfile: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
  contactName: z.string().trim().min(1).max(140).optional(),
  contactPhone: z.string().trim().min(3).max(40).optional(),
  city: z.string().trim().min(2).max(120),
  googlePlaceId: z.string().trim().max(200).optional(),
  googleMapsUrl: z.string().url().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url().max(1000),
        fileKey: z.string().trim().min(1).max(500),
        mimeType: z.string().trim().max(255).nullable().optional(),
        sizeBytes: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .max(10)
    .optional(),
  attributeValues: z.array(attributeValueSchema).max(50).optional(),
});

function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || "ogloszenie";
}

export async function GET() {
  const posts = await db.posts.findMany({
    where: {
      status: "PUBLISHED",
      deleted_at: null,
    },
    orderBy: [{ is_promoted: "desc" }, { published_at: "desc" }, { created_at: "desc" }],
    take: 50,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          email: true,
          avatar_url: true,
        },
      },
      images: {
        orderBy: {
          sort_order: "asc",
        },
        select: {
          storage_key: true,
        },
      },
      _count: {
        select: {
          favorited_by: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description,
        city: post.city,
        priceCents: post.price_cents,
        currency: post.currency,
        status: post.status,
        createdAt: post.created_at,
        publishedAt: post.published_at,
        isPromoted: post.is_promoted,
        category: post.category,
        author: {
          id: post.author.id,
          username: post.author.username,
          email: post.author.email,
          avatarUrl: post.author.avatar_url,
        },
        coverImageUrl: post.images[0]?.storage_key ?? null,
        favoritesCount: post._count.favorited_by,
      })),
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
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

  if (!session.user.email_verified_at) {
    return NextResponse.json({ message: "Only verified users can create listings." }, { status: 403 });
  }

  const body = await request.json();
  const parsedInput = createPostSchema.safeParse(body);

  if (!parsedInput.success) {
    return NextResponse.json(
      {
        message: parsedInput.error.issues[0]?.message ?? "Invalid listing payload.",
      },
      { status: 400 },
    );
  }

  const input = parsedInput.data;

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
    where: {
      category_id: {
        in: inheritanceChain,
      },
    },
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
  const missingRequired = categoryAttributes.filter(
    (attr) => attr.is_required && !providedAttributeIds.has(attr.id),
  );

  if (missingRequired.length > 0) {
    return NextResponse.json(
      {
        message: `Missing required attributes: ${missingRequired.map((a) => a.name).join(", ")}.`,
        missingAttributes: missingRequired.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
      },
      { status: 400 },
    );
  }

  // Validate that submitted attribute IDs belong to this category
  if ((input.attributeValues ?? []).length > 0) {
    const validAttributeIds = new Set(categoryAttributes.map((a) => a.id));
    const invalidIds = (input.attributeValues ?? []).filter((v) => !validAttributeIds.has(v.attributeId));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { message: "One or more attribute IDs do not belong to the selected category." },
        { status: 400 },
      );
    }
  }

  const slugBase = slugify(input.title);
  const uniquePart = crypto.randomUUID().slice(0, 8);
  const slug = `${slugBase}-${uniquePart}`;

  const created = await db.$transaction(async (tx) => {
    const post = await tx.posts.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        category_id: input.categoryId,
        created_by: session.user.id,
        company_id: input.useCompanyProfile ? session.user.company_id ?? null : null,
        price_cents: input.priceCents,
        is_negotiable: input.isNegotiable ?? false,
        auto_renew: input.autoRenew ?? false,
        contact_name: input.contactName ?? null,
        contact_phone: input.contactPhone ?? null,
        city: input.city,
        lat: input.lat,
        lng: input.lng,
        status: "PUBLISHED",
        published_at: new Date(),
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
        author: {
          select: { id: true, username: true, email: true, avatar_url: true },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          orderBy: { sort_order: "asc" },
          select: { storage_key: true },
        },
      },
    });

    if (input.attributeValues?.length) {
      await tx.post_attribute_values.createMany({
        data: input.attributeValues.map((v) => ({
          post_id: post.id,
          attribute_id: v.attributeId,
          value_text: v.valueText ?? null,
          value_number: v.valueNumber !== undefined ? Math.round(v.valueNumber) : null,
          value_boolean: v.valueBoolean ?? null,
          value_date: v.valueDate ? new Date(v.valueDate) : null,
          value_json: v.valueJson !== undefined ? v.valueJson : undefined,
        })),
      });
    }

    return post;
  });

  return NextResponse.json(
    {
      message: "Listing created successfully.",
      post: {
        id: created.id,
        title: created.title,
        slug: created.slug,
        city: created.city,
        priceCents: created.price_cents,
        isNegotiable: created.is_negotiable,
        autoRenew: created.auto_renew,
        contactName: created.contact_name,
        contactPhone: created.contact_phone,
        currency: created.currency,
        category: created.category,
        author: {
          id: created.author.id,
          username: created.author.username,
          email: created.author.email,
          avatarUrl: created.author.avatar_url,
        },
        images: created.images.map((image) => image.storage_key),
        lat: created.lat,
        lng: created.lng,
        googlePlaceId: input.googlePlaceId ?? null,
        googleMapsUrl: input.googleMapsUrl ?? null,
      },
    },
    { status: 201 },
  );
}
