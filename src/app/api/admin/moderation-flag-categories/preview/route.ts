import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { createModerationFlagCategoryDraft } from "@/lib/moderation/draft-store";
import { buildModerationFlagCategoryTree, parseModerationFlagCategoriesXml } from "@/lib/moderation/flag-category-import";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const previewSchema = z.object({
  xml: z.string().min(10),
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
    const input = previewSchema.parse(body);
    const categories = parseModerationFlagCategoriesXml(input.xml);
    const draft = createModerationFlagCategoryDraft({
      createdByUserId: session.user.id,
      categories,
    });

    return NextResponse.json({
      draftId: draft.id,
      summary: {
        categoriesCount: categories.length,
      },
      tree: buildModerationFlagCategoryTree(categories),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse XML.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
