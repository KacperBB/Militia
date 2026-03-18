import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";

export default async function AdminTaxonomyImportPage() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  redirect("/dashboard/admin/site-settings");
}
