import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deleteModerationFlagCategoryDraft, getModerationFlagCategoryDraft } from "@/lib/moderation/draft-store";
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
    const draft = getModerationFlagCategoryDraft(input.draftId);

    if (!draft) {
      return NextResponse.json({ message: "Draft not found or expired." }, { status: 404 });
    }

    if (draft.createdByUserId !== session.user.id) {
      return NextResponse.json({ message: "You can only commit your own draft." }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      const idBySlug = new Map();

      for (const category of draft.categories) {
        const saved = await tx.moderation_flag_categories.upsert({
          where: { slug: category.slug },
          update: {
            name: category.name,
            target_type: "POST",
            is_active: true,
          },
          create: {
            slug: category.slug,
            name: category.name,
            target_type: "POST",
            is_active: true,
          },
          select: {
            id: true,
            slug: true,
          },
        });

        idBySlug.set(saved.slug, saved.id);
      }

      for (const category of draft.categories) {
        const categoryId = idBySlug.get(category.slug);
        if (!categoryId) {
          continue;
        }

        await tx.moderation_flag_categories.update({
          where: { id: categoryId },
          data: {
            parent_id: category.parentSlug ? idBySlug.get(category.parentSlug) ?? null : null,
          },
        });
      }
    });

    deleteModerationFlagCategoryDraft(input.draftId);

    return NextResponse.json({ message: "Moderation flag categories imported successfully." }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to commit moderation flag categories import.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
