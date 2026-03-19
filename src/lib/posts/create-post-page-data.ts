import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function getCreatePostPageData() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/auth/login");
  }

  const categories = await db.categories.findMany({
    orderBy: [{ parent_id: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parent_id: true,
    },
  });

  return {
    categories,
    isEmailVerified: Boolean(session.user.email_verified_at),
    currentUser: {
      email: session.user.email,
      firstName: session.user.first_name ?? "",
      lastName: session.user.last_name ?? "",
      phone: session.user.phone ?? "",
      hasCompany: Boolean(session.user.company_id),
    },
  };
}