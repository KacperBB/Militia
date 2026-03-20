import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { applyPostLifecycle } from "@/lib/posts/status";
import { unauthorized } from "@/lib/security/responses";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (!["ADMIN", "MODERATOR"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  await applyPostLifecycle();

  const posts = await db.posts.findMany({
    where: {
      deleted_at: null,
    },
    orderBy: [{ created_at: "desc" }],
    take: 200,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const postIds = posts.map((post) => post.id);
  const authorIds = posts.map((post) => post.created_by);

  const [postFlags, userFlags] = await Promise.all([
    db.moderation_flags.findMany({
      where: {
        target_type: "POST",
        target_id: { in: postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"] },
        status: "OPEN",
      },
      select: {
        target_id: true,
      },
    }),
    db.moderation_flags.findMany({
      where: {
        target_type: "USER",
        target_id: { in: authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"] },
        status: "OPEN",
      },
      select: {
        target_id: true,
      },
    }),
  ]);

  const postFlagCount = postFlags.reduce<Record<string, number>>((acc, flag) => {
    acc[flag.target_id] = (acc[flag.target_id] ?? 0) + 1;
    return acc;
  }, {});

  const userFlagCount = userFlags.reduce<Record<string, number>>((acc, flag) => {
    acc[flag.target_id] = (acc[flag.target_id] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json(
    {
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        status: post.status,
        city: post.city,
        isPromoted: post.is_promoted,
        createdAt: post.created_at,
        publishedAt: post.published_at,
        expiresAt: post.expires_at,
        category: post.category,
        author: {
          id: post.author.id,
          username: post.author.username,
          email: post.author.email,
        },
        postOpenFlags: postFlagCount[post.id] ?? 0,
        authorOpenFlags: userFlagCount[post.created_by] ?? 0,
      })),
    },
    { status: 200 },
  );
}
