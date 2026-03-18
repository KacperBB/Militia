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
    marketingConsent: boolean;
  } | null;
};

export function SettingsPageContent({ initialUser, initialCompany }: SettingsPageContentProps) {
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_35%),linear-gradient(180deg,#fffdf7_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-4xl bg-slate-950 px-8 py-10 text-white shadow-[0_30px_120px_rgba(15,23,42,0.28)]">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">{tr("Ustawienia", "Settings")}</div>
          <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">{tr("Edytuj dane konta prywatnego i firmowego.", "Edit personal and company account details.")}</h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-slate-300">
            {tr(
              "Tutaj ustawiasz zdjecie profilowe, dane kontaktowe i opis dzialalnosci. Upload obrazow jest obslugiwany przez UploadThing.",
              "Configure profile image, contact data, and business description here. Image uploads are handled by UploadThing.",
            )}
          </p>
          <div className="mt-10 grid gap-4 text-sm text-slate-300">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">{tr("Konto prywatne i konto firmowe maja osobne avatar URL.", "Personal and company accounts use separate avatar URLs.")}</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">{tr("Opis firmy i branding nie sa juz ustawiane w rejestracji.", "Company description and branding are now managed in settings.")}</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">{tr("To pierwszy zakres ustawien. Panel admin/moderator dodamy jako kolejny krok.", "This is the first settings scope. Admin/moderator settings will be added next.")}</div>
          </div>
        </section>

        <section className="rounded-4xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">{tr("Profil", "Profile")}</div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">{tr("Opcje konta", "Account options")}</h2>
          </div>

          <SettingsForm initialCompany={initialCompany} initialUser={initialUser} />
        </section>
      </div>
    </main>
  );
}
