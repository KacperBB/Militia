"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  usernameOrEmail: string;
};

export function ModeratorDashboardContent({ usernameOrEmail }: Props) {
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-950">{tr("Panel Moderatora", "Moderator Panel")}</h1>
          <p className="mt-2 text-lg text-slate-600">{tr("Witaj", "Welcome")}, {usernameOrEmail}</p>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-red-700">{tr("Zgloszenia do przegladu", "Reports to review")}</div>
            <div className="mt-2 text-3xl font-bold text-red-900">0</div>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-yellow-700">{tr("Oczekujace decyzje", "Pending decisions")}</div>
            <div className="mt-2 text-3xl font-bold text-yellow-900">0</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-600">{tr("Zablokowani uzytkownicy", "Blocked users")}</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">0</div>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="text-sm font-medium text-green-700">{tr("Zatwierdzone zgloszenia", "Approved reports")}</div>
            <div className="mt-2 text-3xl font-bold text-green-900">0</div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("Zgloszone tresci", "Flagged content")}</h2>
              <p className="mt-2 text-slate-600">{tr("Tresci czekajace na przeglad moderacyjny", "Content waiting for moderation review")}</p>
              <Link href="/dashboard/moderator/flagged" className="mt-6 inline-block rounded-full bg-red-500 px-6 py-3 font-semibold text-white transition hover:bg-red-600">
                {tr("Przejrzyj zgloszenia", "Review reports")}
              </Link>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">{tr("Kolejka moderacji", "Moderation queue")}</h2>
              <p className="mt-4 text-center text-slate-500">{tr("Brak elementow w kolejce", "Queue is empty")}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">{tr("Narzedzia moderacji", "Moderation tools")}</h3>
              <div className="mt-4 space-y-3">
                <Link href="/dashboard/moderator/flagged" className="block rounded-lg bg-red-50 p-3 text-sm transition hover:bg-red-100">{tr("Zgloszenia", "Reports")}</Link>
                <Link href="/dashboard/moderator/users" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">{tr("Zarzadzaj uzytkownikami", "Manage users")}</Link>
                <Link href="/dashboard/moderator/logs" className="block rounded-lg bg-slate-50 p-3 text-sm transition hover:bg-slate-100">{tr("Logi akcji", "Action logs")}</Link>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">{tr("Statystyki", "Stats")}</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">{tr("Twoje decyzje", "Your decisions")}</span>
                  <span className="font-bold text-slate-900">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{tr("Sredni czas", "Average time")}</span>
                  <span className="font-bold text-slate-900">-</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
