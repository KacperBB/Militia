"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  usernameOrEmail: string;
};

export function AdminDashboardContent({ usernameOrEmail }: Props) {
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-950">{tr("Panel Administratora", "Admin Panel")}</h1>
          <p className="mt-2 text-lg text-slate-600">{tr("Witaj", "Welcome")}, {usernameOrEmail}</p>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-blue-700">{tr("Calkowici uzytkownicy", "Total users")}</div>
            <div className="mt-2 text-3xl font-bold text-blue-900">0</div>
          </div>

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-purple-700">{tr("Ogloszenia", "Listings")}</div>
            <div className="mt-2 text-3xl font-bold text-purple-900">0</div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-green-700">{tr("Aktywne firmy", "Active companies")}</div>
            <div className="mt-2 text-3xl font-bold text-green-900">0</div>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-red-700">{tr("Zgloszenia", "Reports")}</div>
            <div className="mt-2 text-3xl font-bold text-red-900">0</div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("System", "System")}</h2>
              <p className="mt-2 text-slate-600">{tr("Zarzadzanie i monitoring systemu", "System management and monitoring")}</p>
              <Link href="/dashboard/admin/site-settings" className="mt-6 inline-block rounded-full bg-blue-500 px-6 py-3 font-semibold text-white transition hover:bg-blue-600">
                {tr("Ustawienia witryny", "Site settings")}
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("Zarzadzanie uzytkownikami", "User management")}</h2>
              <p className="mt-2 text-slate-600">{tr("Wyswietl, edytuj i zarzadzaj kontami uzytkownikow", "View, edit and manage user accounts")}</p>
              <Link href="/dashboard/admin/users" className="mt-6 inline-block rounded-full bg-purple-500 px-6 py-3 font-semibold text-white transition hover:bg-purple-600">
                {tr("Uzytkownicy", "Users")}
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("Moderacja tresci", "Content moderation")}</h2>
              <p className="mt-2 text-slate-600">{tr("Przeglad i zarzadzanie zgloszonymi tresciami", "Review and manage reported content")}</p>
              <Link href="/dashboard/admin/moderation" className="mt-6 inline-block rounded-full bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600">
                {tr("Moderacja", "Moderation")}
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">{tr("Szybkie dostepy", "Quick links")}</h3>
              <div className="mt-4 space-y-3">
                <Link href="/dashboard/admin/users" className="block rounded-lg bg-blue-50 p-3 text-sm transition hover:bg-blue-100">{tr("Wszyscy uzytkownicy", "All users")}</Link>
                <Link href="/dashboard/admin/site-settings" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">{tr("Ustawienia witryny", "Site settings")}</Link>
                <Link href="/dashboard/admin/moderators" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">{tr("Moderatorzy", "Moderators")}</Link>
                <Link href="/dashboard/admin/analytics" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">{tr("Analityka", "Analytics")}</Link>
                <Link href="/dashboard/admin/audit-log" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">{tr("Logi audytu", "Audit logs")}</Link>
              </div>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
              <h3 className="font-bold text-green-900">{tr("Status systemu", "System status")}</h3>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-green-500"></span>
                  <span className="text-green-900">{tr("Wszystko dziala", "All systems operational")}</span>
                </div>
                <div className="text-xs text-green-700">{tr("Ostatnia aktualizacja: teraz", "Last update: now")}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
