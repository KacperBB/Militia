"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";

type UserDashboardContentProps = {
  usernameOrEmail: string;
};

export function UserDashboardContent({ usernameOrEmail }: UserDashboardContentProps) {
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-950">{tr("Dashboard Uzytkownika", "User Dashboard")}</h1>
          <p className="mt-2 text-lg text-slate-600">{tr("Witaj", "Welcome")}, {usernameOrEmail}</p>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-600">{tr("Moje ogloszenia", "My listings")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">0</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-600">{tr("Ulubione", "Favorites")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">0</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-600">{tr("Wiadomosci", "Messages")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">0</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-600">{tr("Oszacowana wartosc", "Estimated value")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">-</div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("Dodaj nowe ogloszenie", "Create new listing")}</h2>
              <p className="mt-2 text-slate-600">{tr("Zarabiaj sprzedajac swoje przedmioty", "Earn by selling your items")}</p>
              <Link
                href="/ogloszenia/dodaj"
                className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                + {tr("Nowe ogloszenie", "New listing")}
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("Ostatnia aktywnosc", "Recent activity")}</h2>
              <p className="mt-4 text-center text-slate-500">{tr("Brak aktywnosci", "No activity")}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">{tr("Szybkie linki", "Quick links")}</h3>
              <div className="mt-4 space-y-3">
                <Link href="/ogloszenia/dodaj" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">
                  {tr("Dodaj ogloszenie", "Create listing")}
                </Link>
                <Link href="/dashboard/user/listings" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">
                  {tr("Moje ogloszenia", "My listings")}
                </Link>
                <Link href="/ogloszenia" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">
                  {tr("Przegladaj ogloszenia", "Browse listings")}
                </Link>
                <Link href="/dashboard/user/favorites" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">
                  {tr("Ulubione", "Favorites")}
                </Link>
                <Link href="/dashboard/user/messages" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">
                  {tr("Wiadomosci", "Messages")}
                </Link>
                <Link href="/dashboard/user/reviews" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">
                  {tr("Opinie", "Reviews")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
