import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function getCreatePostPageData() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "USER") {
    redirect("/auth/login");
  }

  const categories = await db.categories.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  return {
    categories,
    isEmailVerified: Boolean(session.user.email_verified_at),
  };
}