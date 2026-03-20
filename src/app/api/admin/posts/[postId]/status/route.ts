import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  POST_STATUSES,
  canTransitionToPublished,
  canTransitionToReview,
  canTransitionToReviewed,
  nextValidityDate,
} from "@/lib/posts/status";
import { isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const payloadSchema = z.object({
  action: z.enum([
    "REVIEW_POST",
    "REVIEWED",
    "REVIEWED_PUBLISHED",
    "PUBLISH",
    "MARK_EXPIRED",
    "PROMOTE",
    "UNPROMOTE",
  ]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (!["ADMIN", "MODERATOR"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { postId } = await params;

  const post = await db.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      status: true,
      is_promoted: true,
      published_at: true,
      expires_at: true,
      deleted_at: true,
    },
  });

  if (!post || post.deleted_at) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  const action = parsed.data.action;

  if (action === "REVIEW_POST") {
    if (!canTransitionToReview(post.status)) {
      return NextResponse.json({ message: "This post cannot be moved to review." }, { status: 400 });
    }

    const updated = await db.posts.update({
      where: { id: post.id },
      data: { status: POST_STATUSES.IN_REVIEW },
      select: { id: true, status: true, is_promoted: true, published_at: true, expires_at: true },
    });

    return NextResponse.json({ message: "Post moved to review.", post: updated }, { status: 200 });
  }

  if (action === "REVIEWED") {
    if (!canTransitionToReviewed(post.status)) {
      return NextResponse.json({ message: "Only posts in review can be marked as reviewed." }, { status: 400 });
    }

    const updated = await db.posts.update({
      where: { id: post.id },
      data: { status: POST_STATUSES.REVIEWED },
      select: { id: true, status: true, is_promoted: true, published_at: true, expires_at: true },
    });

    return NextResponse.json({ message: "Post reviewed.", post: updated }, { status: 200 });
  }

  if (action === "REVIEWED_PUBLISHED" || action === "PUBLISH") {
    if (!canTransitionToPublished(post.status)) {
      return NextResponse.json({ message: "This post cannot be published." }, { status: 400 });
    }

    const now = new Date();

    const updated = await db.posts.update({
      where: { id: post.id },
      data: {
        status: POST_STATUSES.PUBLISHED,
        published_at: post.published_at ?? now,
        expires_at: nextValidityDate(now),
      },
      select: { id: true, status: true, is_promoted: true, published_at: true, expires_at: true },
    });

    return NextResponse.json({ message: "Post published.", post: updated }, { status: 200 });
  }

  if (action === "MARK_EXPIRED") {
    const updated = await db.posts.update({
      where: { id: post.id },
      data: { status: POST_STATUSES.EXPIRED },
      select: { id: true, status: true, is_promoted: true, published_at: true, expires_at: true },
    });

    return NextResponse.json({ message: "Post expired.", post: updated }, { status: 200 });
  }

  if (action === "PROMOTE" || action === "UNPROMOTE") {
    const shouldPromote = action === "PROMOTE";
    const updated = await db.posts.update({
      where: { id: post.id },
      data: { is_promoted: shouldPromote },
      select: { id: true, status: true, is_promoted: true, published_at: true, expires_at: true },
    });

    return NextResponse.json(
      {
        message: shouldPromote ? "Post promoted." : "Promotion removed.",
        post: updated,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
}
