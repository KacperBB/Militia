import { NextRequest, NextResponse } from "next/server";
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
    });

    deleteTaxonomyDraft(input.draftId);

    return NextResponse.json(
      {
        message: "Taxonomy import committed successfully.",
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to commit taxonomy import.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
