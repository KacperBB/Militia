import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/security/responses";

function extractPostReference(details: string | null) {
  if (!details) {
    return null;
  }

  const postIdMatch = details.match(/\[POST_ID=([a-f0-9-]{36})\]/i);
  const postTitleMatch = details.match(/\[POST_TITLE=([^\]]+)\]/i);

  if (!postIdMatch) {
    return null;
  }

  return {
    postId: postIdMatch[1],
    postTitle: postTitleMatch?.[1] ?? null,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { userId } = await params;

  const [user, flags] = await Promise.all([
    db.users.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true },
    }),
    db.moderation_flags.findMany({
      where: {
        target_type: "USER",
        target_id: userId,
      },
      orderBy: [{ created_at: "desc" }],
      include: {
        creator: {
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
        subcategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const formatted = flags.map((flag) => {
    const postReference = extractPostReference(flag.details);

    return {
      id: flag.id,
      reason: flag.reason,
      details: flag.details,
      status: flag.status,
      createdAt: flag.created_at,
      updatedAt: flag.updated_at,
      createdBy: flag.creator
        ? {
            id: flag.creator.id,
            username: flag.creator.username,
            email: flag.creator.email,
          }
        : null,
      category: flag.category
        ? {
            id: flag.category.id,
            name: flag.category.name,
          }
        : null,
      subcategory: flag.subcategory
        ? {
            id: flag.subcategory.id,
            name: flag.subcategory.name,
          }
        : null,
      postReference,
    };
  });

  return NextResponse.json(
    {
      user,
      openFlags: formatted.filter((flag) => flag.status !== "ARCHIVED"),
      archivedFlags: formatted.filter((flag) => flag.status === "ARCHIVED"),
    },
    { status: 200 },
  );
}
