import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { POST_STATUSES } from "@/lib/posts/status";
import { isTrustedOrigin } from "@/lib/security/http";
import { badRequest, unauthorized } from "@/lib/security/responses";

const payloadSchema = z.object({
  action: z.enum(["CANCEL"]),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  if (!isTrustedOrigin(request)) {
    return badRequest("Untrusted origin.");
  }

  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (session.user.status !== "ACTIVE") {
    return NextResponse.json({ message: "Account is not active." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
  }

  const { postId } = await params;

  const post = await db.posts.findUnique({
    where: { id: postId },
    select: { id: true, created_by: true, status: true, deleted_at: true },
  });

  if (!post || post.deleted_at) {
    return NextResponse.json({ message: "Post not found." }, { status: 404 });
  }

  if (post.created_by !== session.user.id) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  if (post.status === POST_STATUSES.CANCELLED) {
    return NextResponse.json({ message: "Post is already cancelled." }, { status: 200 });
  }

  if (post.status === POST_STATUSES.EXPIRED) {
    return NextResponse.json({ message: "Expired post cannot be cancelled." }, { status: 400 });
  }

  const updated = await db.posts.update({
    where: { id: post.id },
    data: { status: POST_STATUSES.CANCELLED },
    select: { id: true, status: true },
  });

  return NextResponse.json({ message: "Post cancelled.", post: updated }, { status: 200 });
}
