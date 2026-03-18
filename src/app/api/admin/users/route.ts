import { NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/security/responses";

const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const ALLOWED_PAGE_SIZES = new Set([10, 25, 50, 100]);

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session) {
    return unauthorized("You must be logged in.");
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const pageRaw = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSizeRaw = Number(request.nextUrl.searchParams.get("pageSize") ?? "10");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = ALLOWED_PAGE_SIZES.has(pageSizeRaw) ? pageSizeRaw : 10;

  const total = await db.users.count();
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * pageSize;

  const users = await db.users.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      avatar_url: true,
      status: true,
      role: true,
      company_id: true,
    },
    orderBy: [{ created_at: "desc" }],
    skip,
    take: pageSize,
  });

  const userIds = users.map((item) => item.id);

  const [flags, sessionsByUser] = await Promise.all([
    db.moderation_flags.findMany({
      where: {
        target_type: "USER",
        target_id: {
          in: userIds,
        },
      },
      select: {
        target_id: true,
        status: true,
      },
    }),
    db.user_sessions.groupBy({
      by: ["user_id"],
      where: {
        expires_at: {
          gt: new Date(),
        },
        user_id: {
          in: userIds,
        },
      },
      _max: {
        last_seen_at: true,
      },
    }),
  ]);

  const countsByUserId = new Map();
  const sessionMap = new Map();
  const nowMs = Date.now();

  for (const item of sessionsByUser) {
    sessionMap.set(item.user_id, item._max.last_seen_at ?? null);
  }

  for (const flag of flags) {
    const current = countsByUserId.get(flag.target_id) ?? { open: 0, archived: 0 };

    if (flag.status === "ARCHIVED") {
      current.archived += 1;
    } else {
      current.open += 1;
    }

    countsByUserId.set(flag.target_id, current);
  }

  return NextResponse.json(
    {
      users: users.map((user) => {
        const counts = countsByUserId.get(user.id) ?? { open: 0, archived: 0 };
        const lastSeenAt = sessionMap.get(user.id) ?? null;
        const isActive =
          user.status === "ACTIVE" &&
          Boolean(lastSeenAt) &&
          nowMs - new Date(lastSeenAt).getTime() <= ACTIVE_WINDOW_MS;

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatar_url,
          status: user.status,
          role: user.role,
          accountType: user.company_id ? "COMPANY" : "PRIVATE",
          isActive,
          lastSeenAt,
          reports: {
            open: counts.open,
            archived: counts.archived,
          },
        };
      }),
      pagination: {
        page: currentPage,
        pageSize,
        total,
        totalPages,
      },
    },
    { status: 200 },
  );
}
