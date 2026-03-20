import { NextResponse } from "next/server";

import { getSafeUserById } from "@/lib/auth/service";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await getSafeUserById(session.user_id);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const favoritesCount = await db.favorites.count({
    where: {
      user_id: user.id,
      post: {
        deleted_at: null,
        status: "PUBLISHED",
      },
    },
  });

  return NextResponse.json({
    user: {
      ...user,
      favoritesCount,
    },
  });
}
