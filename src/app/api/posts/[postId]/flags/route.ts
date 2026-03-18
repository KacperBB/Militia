import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { assertJsonRequest, isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const postFlagSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  details: z.string().trim().max(1500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
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
    return NextResponse.json({ message: "Only verified users can submit reports." }, { status: 403 });
  }

  const { postId } = await params;

  const post = await db.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      created_by: true,
    },
  });

  if (!post) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  const body = await request.json();
  const input = postFlagSchema.parse(body);

  const [category, subcategory] = await Promise.all([
    db.moderation_flag_categories.findUnique({
      where: { id: input.categoryId },
      select: { id: true, name: true, parent_id: true, target_type: true, is_active: true },
    }),
    input.subcategoryId
      ? db.moderation_flag_categories.findUnique({
          where: { id: input.subcategoryId },
          select: { id: true, name: true, parent_id: true, target_type: true, is_active: true },
        })
      : null,
  ]);

  if (!category || !category.is_active || category.target_type !== "POST") {
    return NextResponse.json({ message: "Report category not found." }, { status: 404 });
  }

  if (subcategory) {
    if (!subcategory.is_active || subcategory.target_type !== "POST") {
      return NextResponse.json({ message: "Report subcategory not found." }, { status: 404 });
    }

    if (subcategory.parent_id !== category.id) {
      return NextResponse.json({ message: "Selected subcategory does not belong to selected category." }, { status: 400 });
    }
  }

  const reason = subcategory ? `${category.name} / ${subcategory.name}` : category.name;

  const userDetails = [
    input.details ?? "",
    `[POST_ID=${post.id}]`,
    `[POST_TITLE=${post.title}]`,
  ]
    .filter(Boolean)
    .join("\n");

  const [postFlag, userFlag] = await db.$transaction([
    db.moderation_flags.create({
      data: {
        target_type: "POST",
        target_id: post.id,
        category_id: category.id,
        subcategory_id: subcategory?.id,
        reason,
        details: input.details,
        created_by: session.user.id,
        status: "OPEN",
      },
      select: {
        id: true,
        target_type: true,
        target_id: true,
      },
    }),
    db.moderation_flags.create({
      data: {
        target_type: "USER",
        target_id: post.created_by,
        category_id: category.id,
        subcategory_id: subcategory?.id,
        reason: `POST_REPORT: ${reason}`,
        details: userDetails,
        created_by: session.user.id,
        status: "OPEN",
      },
      select: {
        id: true,
        target_type: true,
        target_id: true,
      },
    }),
  ]);

  return NextResponse.json(
    {
      message: "Report submitted for post and post author.",
      flags: {
        post: postFlag,
        user: userFlag,
      },
    },
    { status: 201 },
  );
}
