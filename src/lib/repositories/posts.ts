import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type CreatePostInput = {
  title: string;
  slug: string;
  description: string;
  categoryId: string;
  createdBy: string;
  priceCents?: number;
  companyId?: string;
  city?: string;
  isPromoted?: boolean;
  tagIds?: string[];
};

export async function createPost(input: CreatePostInput) {
  return db.posts.create({
    data: {
      title: input.title,
      slug: input.slug,
      description: input.description,
      category_id: input.categoryId,
      created_by: input.createdBy,
      price_cents: input.priceCents,
      company_id: input.companyId,
      city: input.city,
      is_promoted: input.isPromoted ?? false,
      tags: input.tagIds
        ? {
            createMany: {
              data: input.tagIds.map((tagId) => ({ tag_id: tagId })),
              skipDuplicates: true,
            },
          }
        : undefined,
    },
    include: {
      category: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function listPublishedPosts(filters?: {
  categoryId?: string;
  city?: string;
  take?: number;
}) {
  return db.posts.findMany({
    where: {
      status: "PUBLISHED",
      deleted_at: null,
      category_id: filters?.categoryId,
      city: filters?.city,
    },
    orderBy: [{ is_promoted: "desc" }, { published_at: "desc" }, { created_at: "desc" }],
    take: filters?.take ?? 20,
    include: {
      category: true,
      images: {
        orderBy: { sort_order: "asc" },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function listPosts(args?: Prisma.postsFindManyArgs) {
  return db.posts.findMany(args);
}
