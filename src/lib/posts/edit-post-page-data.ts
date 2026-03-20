import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export type EditPostInitialData = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  price: string;
  isNegotiable: boolean;
  listingProfileType: "PRIVATE" | "COMPANY";
  autoRenew: boolean;
  city: string;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  contactName: string;
  contactPhone: string;
  images: Array<{
    id: string;
    url: string;
    fileKey: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
  }>;
  attributeValues: Record<
    string,
    {
      attributeId: string;
      valueText?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
      valueDate?: string;
      valueJson?: string[];
    }
  >;
};

export async function getEditPostPageData(postId: string) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/auth/login");
  }

  const [categories, post] = await Promise.all([
    db.categories.findMany({
      orderBy: [{ parent_id: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        keywords: true,
        parent_id: true,
      },
    }),
    db.posts.findUnique({
      where: { id: postId },
      include: {
        images: {
          orderBy: { sort_order: "asc" },
          select: {
            id: true,
            storage_key: true,
            mime_type: true,
            size_bytes: true,
          },
        },
        attribute_values: {
          select: {
            attribute_id: true,
            value_text: true,
            value_number: true,
            value_boolean: true,
            value_date: true,
            value_json: true,
          },
        },
      },
    }),
  ]);

  if (!post || post.deleted_at) {
    redirect("/dashboard/user/listings");
  }

  const canEdit = post.created_by === session.user.id || ["ADMIN", "MODERATOR"].includes(session.user.role);

  if (!canEdit) {
    redirect("/auth/login");
  }

  const attributeValues = Object.fromEntries(
    post.attribute_values.map((value) => [
      value.attribute_id,
      {
        attributeId: value.attribute_id,
        ...(value.value_text ? { valueText: value.value_text } : {}),
        ...(value.value_number !== null && value.value_number !== undefined
          ? { valueNumber: Number(value.value_number) }
          : {}),
        ...(typeof value.value_boolean === "boolean" ? { valueBoolean: value.value_boolean } : {}),
        ...(value.value_date ? { valueDate: value.value_date.toISOString() } : {}),
        ...(Array.isArray(value.value_json) ? { valueJson: value.value_json.filter((item): item is string => typeof item === "string") } : {}),
      },
    ]),
  );

  return {
    categories,
    isEmailVerified: Boolean(session.user.email_verified_at),
    currentUser: {
      email: session.user.email,
      firstName: session.user.first_name ?? "",
      lastName: session.user.last_name ?? "",
      phone: session.user.phone ?? "",
      hasCompany: Boolean(session.user.company_id),
    },
    initialData: {
      id: post.id,
      title: post.title,
      description: post.description,
      categoryId: post.category_id,
      price: typeof post.price_cents === "number" ? (post.price_cents / 100).toFixed(2) : "",
      isNegotiable: post.is_negotiable,
      listingProfileType: post.company_id ? "COMPANY" : "PRIVATE",
      autoRenew: post.auto_renew,
      city: post.city ?? "",
      googlePlaceId: null,
      googleMapsUrl: null,
      lat: post.lat !== null && post.lat !== undefined ? Number(post.lat) : null,
      lng: post.lng !== null && post.lng !== undefined ? Number(post.lng) : null,
      contactName: post.contact_name ?? "",
      contactPhone: post.contact_phone ?? "",
      images: post.images.map((image, index) => ({
        id: image.id,
        url: image.storage_key,
        fileKey: image.storage_key,
        fileName: `image-${index + 1}`,
        mimeType: image.mime_type ?? null,
        sizeBytes: image.size_bytes ?? null,
      })),
      attributeValues,
    } satisfies EditPostInitialData,
  };
}