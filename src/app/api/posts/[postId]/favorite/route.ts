import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

async function validateSession() {
  const session = await getCurrentSession();

  if (!session) {
    return { error: unauthorized("You must be logged in.") };
  }

  if (session.user.status !== "ACTIVE") {
    return { error: NextResponse.json({ message: "Account is not active." }, { status: 403 }) };
  }

  if (!session.user.email_verified_at) {
    return { error: NextResponse.json({ message: "Only verified users can add favorites." }, { status: 403 }) };
  }

  return { session };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  const result = await validateSession();
  if (result.error) {
    return result.error;
  }

  const { session } = result;
  const { postId } = await params;

  const post = await db.posts.findUnique({
    where: { id: postId },
    select: { id: true, created_by: true, deleted_at: true, status: true },
  });

  if (!post || post.deleted_at || post.status !== "PUBLISHED") {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  if (post.created_by === session.user.id) {
    return NextResponse.json({ message: "You cannot favorite your own post." }, { status: 400 });
  }

  const existing = await db.favorites.findUnique({
    where: {
      user_id_post_id: {
        user_id: session.user.id,
        post_id: postId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ message: "Post is already in favorites." }, { status: 200 });
  }

  await db.$transaction([
    db.favorites.create({
      data: {
        user_id: session.user.id,
        post_id: postId,
      },
    }),
    db.posts.update({
      where: { id: postId },
      data: {
        favorites_count: { increment: 1 },
      },
    }),
  ]);

  return NextResponse.json({ message: "Added to favorites." }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  const result = await validateSession();
  if (result.error) {
    return result.error;
  }

  const { session } = result;
  const { postId } = await params;

  const existing = await db.favorites.findUnique({
    where: {
      user_id_post_id: {
        user_id: session.user.id,
        post_id: postId,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Favorite not found." }, { status: 200 });
  }

  await db.$transaction([
    db.favorites.delete({
      where: {
        user_id_post_id: {
          user_id: session.user.id,
          post_id: postId,
        },
      },
    }),
    db.posts.update({
      where: { id: postId },
      data: {
        favorites_count: { decrement: 1 },
      },
    }),
  ]);

  return NextResponse.json({ message: "Removed from favorites." }, { status: 200 });
}
