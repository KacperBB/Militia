import { redirect } from "next/navigation";

import { SiteSettingsTabsClient } from "@/components/admin/site-settings-tabs-client";
import { getCurrentSession } from "@/lib/auth/session";

export default async function AdminSiteSettingsPage() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-bold text-slate-900">Ustawienia witryny</h1>
        <p className="mt-1 text-sm text-slate-600">
          Administracyjne ustawienia witryny. Dostep tylko dla roli ADMIN.
        </p>
      </header>
      <SiteSettingsTabsClient />
    </main>
  );
}