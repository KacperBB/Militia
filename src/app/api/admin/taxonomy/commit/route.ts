import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { deleteTaxonomyDraft, getTaxonomyDraft } from "@/lib/taxonomy/draft-store";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const commitSchema = z.object({
  draftId: z.string().uuid(),
});

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

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = commitSchema.parse(body);
    const draft = getTaxonomyDraft(input.draftId);
    let removedCategoriesCount = 0;
    let removedTagsCount = 0;

    if (!draft) {
      return NextResponse.json({ message: "Draft not found or expired." }, { status: 404 });
    }

    if (draft.createdByUserId !== session.user.id) {
      return NextResponse.json({ message: "You can only commit your own draft." }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS category_tags (
          category_id UUID NOT NULL,
          tag_id UUID NOT NULL,
          created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT category_tags_pkey PRIMARY KEY (category_id, tag_id),
          CONSTRAINT category_tags_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT category_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      const categoryIdBySlug = new Map<string, string>();

      for (const category of draft.categories) {
        const saved = await tx.categories.upsert({
          where: { slug: category.slug },
          update: {
            name: category.name,
          },
          create: {
            slug: category.slug,
            name: category.name,
          },
          select: { id: true, slug: true },
        });

        categoryIdBySlug.set(saved.slug, saved.id);
      }

      for (const category of draft.categories) {
        const categoryId = categoryIdBySlug.get(category.slug);

        if (!categoryId) {
          continue;
        }

        await tx.categories.update({
          where: { id: categoryId },
          data: {
            parent_id: category.parentSlug ? categoryIdBySlug.get(category.parentSlug) ?? null : null,
          },
        });
      }

      const importedCategorySlugs = draft.categories.map((category) => category.slug);

      if (importedCategorySlugs.length > 0) {
        const staleCategories = await tx.categories.findMany({
          where: {
            slug: {
              notIn: importedCategorySlugs,
            },
            posts: {
              none: {},
            },
          },
          select: {
            id: true,
          },
        });

        if (staleCategories.length > 0) {
          removedCategoriesCount = staleCategories.length;
          await tx.categories.deleteMany({
            where: {
              id: {
                in: staleCategories.map((category) => category.id),
              },
            },
          });
        }
      }

      const uniqueTags = new Map<string, string>();
      for (const category of draft.categories) {
        for (const tag of category.tags) {
          if (!uniqueTags.has(tag.slug)) {
            uniqueTags.set(tag.slug, tag.name);
          }
        }
      }

      const tagIdBySlug = new Map<string, string>();
      for (const [slug, name] of uniqueTags.entries()) {
        const saved = await tx.tags.upsert({
          where: { slug },
          update: { name },
          create: {
            slug,
            name,
            created_by: session.user.id,
          },
          select: { id: true, slug: true },
        });

        tagIdBySlug.set(saved.slug, saved.id);
      }

      const importedCategoryIds = [...categoryIdBySlug.values()];
      if (importedCategoryIds.length) {
        await tx.$executeRawUnsafe(
          `DELETE FROM category_tags WHERE category_id = ANY($1::uuid[])`,
          importedCategoryIds,
        );
      }

      for (const category of draft.categories) {
        const categoryId = categoryIdBySlug.get(category.slug);

        if (!categoryId) {
          continue;
        }

        for (const tag of category.tags) {
          const tagId = tagIdBySlug.get(tag.slug);

          if (!tagId) {
            continue;
          }

          await tx.$executeRawUnsafe(
            `INSERT INTO category_tags (category_id, tag_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
            categoryId,
            tagId,
          );
        }
      }

      const orphanTagResult = await tx.$executeRawUnsafe(`
        DELETE FROM tags t
        WHERE NOT EXISTS (
          SELECT 1
          FROM post_tags pt
          WHERE pt.tag_id = t.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM category_tags ct
          WHERE ct.tag_id = t.id
        )
      `);

      removedTagsCount = Number(orphanTagResult ?? 0);

      for (const category of draft.categories) {
        const categoryId = categoryIdBySlug.get(category.slug);

        if (!categoryId) {
          continue;
        }

        for (const attribute of category.attributes) {
          const savedAttribute = await tx.category_attributes.upsert({
            where: {
              category_id_slug: {
                category_id: categoryId,
                slug: attribute.slug,
              },
            },
            update: {
              name: attribute.name,
              attribute_type: attribute.type,
              is_required: attribute.isRequired,
              sort_order: attribute.sortOrder,
              metadata_json: attribute.metadata,
            },
            create: {
              category_id: categoryId,
              name: attribute.name,
              slug: attribute.slug,
              attribute_type: attribute.type,
              is_required: attribute.isRequired,
              sort_order: attribute.sortOrder,
              metadata_json: attribute.metadata,
            },
            select: {
              id: true,
              slug: true,
            },
          });

          const currentOptionValues = attribute.options.map((option) => option.value);

          if (currentOptionValues.length) {
            await tx.category_attribute_options.deleteMany({
              where: {
                attribute_id: savedAttribute.id,
                value: {
                  notIn: currentOptionValues,
                },
              },
            });
          } else {
            await tx.category_attribute_options.deleteMany({
              where: {
                attribute_id: savedAttribute.id,
              },
            });
          }

          for (const option of attribute.options) {
            await tx.category_attribute_options.upsert({
              where: {
                attribute_id_value: {
                  attribute_id: savedAttribute.id,
                  value: option.value,
                },
              },
              update: {
                label: option.label,
                sort_order: option.sortOrder,
              },
              create: {
                attribute_id: savedAttribute.id,
                label: option.label,
                value: option.value,
                sort_order: option.sortOrder,
              },
            });
          }
        }

        const importedAttributeSlugs = category.attributes.map((attribute) => attribute.slug);

        if (importedAttributeSlugs.length) {
          await tx.category_attributes.deleteMany({
            where: {
              category_id: categoryId,
              slug: {
                notIn: importedAttributeSlugs,
              },
            },
          });
        } else {
          await tx.category_attributes.deleteMany({
            where: {
              category_id: categoryId,
            },
          });
        }
      }
    });

    deleteTaxonomyDraft(input.draftId);

    revalidatePath("/ogloszenia/dodaj");
    revalidatePath("/dashboard/user/create-ad");

    return NextResponse.json(
      {
        message: "Taxonomy import committed successfully.",
        summary: {
          categoriesCount: draft.categories.length,
          tagsCount: draft.tagsCount,
          attributesCount: draft.attributesCount,
          attributeOptionsCount: draft.attributeOptionsCount,
          removedCategoriesCount,
          removedTagsCount,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message ?? "Invalid request payload.";
      return NextResponse.json({ message }, { status: 400 });
    }

    console.error("Failed to commit taxonomy import", error);
    return NextResponse.json({ message: "Unable to commit taxonomy import." }, { status: 500 });
  }
}
