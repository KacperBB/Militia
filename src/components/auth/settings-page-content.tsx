"use client";

import { SettingsForm } from "@/components/auth/settings-form";
import { useLocale } from "@/components/providers/locale-provider";

type SettingsPageContentProps = {
  initialUser: {
    username: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatarUrl: string;
    marketingConsent: boolean;
  };
  initialCompany: {
    name: string;
    nip: string;
    email: string;
    phone: string;
    address: string;
    zipCode: string;
    city: string;
    description: string;
    avatarUrl: string;
    bannerUrl: string;
    marketingConsent: boolean;
  } | null;
  initialRouteStops: Array<{
    id?: string;
    label: string;
    address: string;
    city: string;
    zipCode: string;
    notes: string;
    availableFrom?: string;
    availableTo?: string;
    lat: number;
    lng: number;
  }>;
};

export function SettingsPageContent({ initialUser, initialCompany, initialRouteStops }: SettingsPageContentProps) {
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);
  const hasSellerProfile = initialCompany !== null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_35%),linear-gradient(180deg,#fffdf7_0%,#f8fafc_100%)] px-4 py-10 text-slate-950 md:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">
            {tr("Ustawienia", "Settings")}
          </div>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                hasSellerProfile
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {hasSellerProfile
                ? tr("Konto sprzedawcy: aktywne", "Seller account: active")
                : tr("Konto sprzedawcy: nieaktywne", "Seller account: inactive")}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            {hasSellerProfile
              ? tr("Ustawienia konta prywatnego i sprzedawcy", "Personal & seller account settings")
              : tr("Ustawienia konta", "Account settings")}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {hasSellerProfile
              ? tr(
                  "Zarządzaj danymi osobowymi, profilem sprzedawcy, avatarem, banerem i opisem firmy.",
                  "Manage personal data, seller profile, avatar, banner and company description.",
                )
              : tr(
                  "Zarządzaj danymi osobowymi i profilem publicznym.",
                  "Manage your personal data and public profile.",
                )}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <a
            href="#section-user"
            className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {tr("Konto osobiste", "Personal account")}
          </a>
          {hasSellerProfile ? (
            <a
              href="#section-seller"
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              {tr("Konto sprzedawcy", "Seller account")}
            </a>
          ) : null}
          {hasSellerProfile ? (
            <a
              href="#section-route"
              className="rounded-full border border-sky-300 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              {tr("Trasa", "Route")}
            </a>
          ) : null}
        </div>

        <SettingsForm
          initialCompany={initialCompany}
          initialRouteStops={initialRouteStops}
          initialUser={initialUser}
        />
      </div>
    </main>
  );
}
