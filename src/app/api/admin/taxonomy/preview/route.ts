import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { createTaxonomyDraft } from "@/lib/taxonomy/draft-store";
import {
  buildTaxonomyTree,
  countAttributeOptions,
  countAttributes,
  countUniqueTags,
  parseTaxonomyXml,
} from "@/lib/taxonomy/xml-import";
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
    const categories = parseTaxonomyXml(input.xml);
    const tagsCount = countUniqueTags(categories);
    const attributesCount = countAttributes(categories);
    const attributeOptionsCount = countAttributeOptions(categories);
    const draft = createTaxonomyDraft({
      createdByUserId: session.user.id,
      categories,
      tagsCount,
      attributesCount,
      attributeOptionsCount,
    });

    return NextResponse.json(
      {
        draftId: draft.id,
        summary: {
          categoriesCount: categories.length,
          tagsCount,
          attributesCount,
          attributeOptionsCount,
        },
        tree: buildTaxonomyTree(categories),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse XML.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
