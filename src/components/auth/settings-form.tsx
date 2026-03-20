"use client";

import { useState } from "react";

import { SellerRouteEditor } from "@/components/auth/seller-route-editor";
import { useLocale } from "@/components/providers/locale-provider";
import { AvatarUploader } from "@/components/upload/avatar-uploader";
import { BannerUploader } from "@/components/upload/banner-uploader";
import { type CompanyRouteStopInput } from "@/lib/company-route";

type UserSettingsInput = {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  marketingConsent: boolean;
};

type CompanySettingsInput = {
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
};

type SettingsFormProps = {
  initialUser: UserSettingsInput;
  initialCompany: CompanySettingsInput | null;
  initialRouteStops: CompanyRouteStopInput[];
};

export function SettingsForm({ initialUser, initialCompany, initialRouteStops }: SettingsFormProps) {
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);
  const [user, setUser] = useState<UserSettingsInput>(initialUser);
  const [company, setCompany] = useState<CompanySettingsInput | null>(initialCompany);
  const [routeStops, setRouteStops] = useState<CompanyRouteStopInput[]>(initialRouteStops);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        user,
        ...(company ? { company } : {}),
        ...(company ? { routeStops } : {}),
      };

      const response = await fetch("/api/auth/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? tr("Aktualizacja ustawien nie powiodla sie.", "Settings update failed."));
      }

      setSuccess(tr("Ustawienia zostaly zapisane.", "Settings saved."));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tr("Aktualizacja ustawien nie powiodla sie.", "Settings update failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-8" onSubmit={handleSubmit}>
      <section id="section-user" className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">1</div>
          <h3 className="text-base font-semibold text-slate-900">{tr("Konto osobiste", "Personal account")}</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500">{tr("Dane prywatne i profil publiczny.", "Private data and public profile.")}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">{tr("Nazwa uzytkownika", "Username")}</span>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-3"
              onChange={(event) => setUser((prev) => ({ ...prev, username: event.target.value }))}
              value={user.username}
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">{tr("Telefon", "Phone")}</span>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-3"
              onChange={(event) => setUser((prev) => ({ ...prev, phone: event.target.value }))}
              value={user.phone}
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">{tr("Imie", "First name")}</span>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-3"
              onChange={(event) => setUser((prev) => ({ ...prev, firstName: event.target.value }))}
              value={user.firstName}
            />
          </label>

          <label className="grid gap-2 text-sm text-slate-700">
            <span className="font-medium">{tr("Nazwisko", "Last name")}</span>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-3"
              onChange={(event) => setUser((prev) => ({ ...prev, lastName: event.target.value }))}
              value={user.lastName}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3">
          <AvatarUploader
            currentUrl={user.avatarUrl || undefined}
            label={tr("Avatar konta", "Account avatar")}
            onUploaded={(url) => {
              setUser((prev) => ({ ...prev, avatarUrl: url }));
            }}
          />
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <input
            checked={user.marketingConsent}
            className="mt-1 h-4 w-4"
            onChange={(event) => setUser((prev) => ({ ...prev, marketingConsent: event.target.checked }))}
            type="checkbox"
          />
          <span>{tr("Zgadzam sie na komunikacje marketingowa.", "I agree to receive marketing communication.")}</span>
        </label>
      </section>

      {company ? (
      <section id="section-seller" className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-xs font-bold text-amber-900">2</div>
            <h3 className="text-base font-semibold text-slate-900">{tr("Konto sprzedawcy", "Seller account")}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">{tr("Dane firmy, branding, baner i opis dzialalnosci.", "Company data, branding, banner and activity description.")}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">{tr("Nazwa firmy", "Company name")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
                value={company.name}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">{tr("NIP", "Tax ID")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, nip: event.target.value } : prev))}
                value={company.nip}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">{tr("Email firmowy", "Company email")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
                type="email"
                value={company.email}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">{tr("Telefon firmowy", "Company phone")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                value={company.phone}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">{tr("Miasto", "City")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, city: event.target.value } : prev))}
                value={company.city}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              <span className="font-medium">{tr("Kod pocztowy", "Postal code")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, zipCode: event.target.value } : prev))}
                value={company.zipCode}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700 sm:col-span-2">
              <span className="font-medium">{tr("Adres", "Address")}</span>
              <input
                className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                value={company.address}
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700 sm:col-span-2">
              <span className="font-medium">{tr("Opis dzialalnosci", "Business description")}</span>
              <textarea
                className="min-h-28 rounded-xl border border-slate-200 bg-white px-3 py-2"
                onChange={(event) => setCompany((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                value={company.description}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            <AvatarUploader
              currentUrl={company.avatarUrl || undefined}
              label={tr("Avatar firmy", "Company avatar")}
              onUploaded={(url) => {
                setCompany((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
              }}
            />
            <BannerUploader
              currentUrl={company.bannerUrl || undefined}
              label={tr("Baner sprzedawcy", "Seller banner")}
              onUploaded={(url) => {
                setCompany((prev) => (prev ? { ...prev, bannerUrl: url } : prev));
              }}
            />
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <input
              checked={company.marketingConsent}
              className="mt-1 h-4 w-4"
              onChange={(event) => setCompany((prev) => (prev ? { ...prev, marketingConsent: event.target.checked } : prev))}
              type="checkbox"
            />
            <span>{tr("Zgoda marketingowa firmy.", "Company marketing consent.")}</span>
          </label>
      </section>
      ) : null}

      {company ? <SellerRouteEditor locale={locale} onChange={setRouteStops} value={routeStops} /> : null}

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      <button
        className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? tr("Zapisywanie...", "Saving...") : tr("Zapisz ustawienia", "Save settings")}
      </button>
    </form>
  );
}
