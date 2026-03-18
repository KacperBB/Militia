"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { useAuthRegisterStore } from "@/stores/auth-register-store";
import { checkPasswordStrength, type PasswordStrength } from "@/lib/auth/password-strength";
import { RegistrationConfirmation } from "./registration-confirmation";

const COUNTRY_DIAL_CODES = [
  { value: "+48", label: "PL +48" },
  { value: "+49", label: "DE +49" },
  { value: "+44", label: "UK +44" },
  { value: "+33", label: "FR +33" },
  { value: "+39", label: "IT +39" },
  { value: "+34", label: "ES +34" },
  { value: "+1", label: "US +1" },
];

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      {children}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
    />
  );
}

export function RegisterForm() {
  const store = useAuthRegisterStore();
  const setField = store.setField;
  const userEmail = store.email;
  const userPhone = store.phone;
  const { locale } = useLocale();
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [emailConfirm, setEmailConfirm] = useState("");
  const [emailConfirmError, setEmailConfirmError] = useState("");
  const [userPhoneCode, setUserPhoneCode] = useState("+48");
  const [companyPhoneCode, setCompanyPhoneCode] = useState("+48");
  const [sameCompanyEmail, setSameCompanyEmail] = useState(false);
  const [sameCompanyPhone, setSameCompanyPhone] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: "",
    color: "",
    isStrong: false,
    feedback: [],
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const emailConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = (pl: string, en: string) => (locale === "en" ? en : pl);

  useEffect(() => {
    if (!sameCompanyEmail) {
      return;
    }

    setField("companyEmail", userEmail);
  }, [sameCompanyEmail, userEmail, setField]);

  useEffect(() => {
    if (!sameCompanyPhone) {
      return;
    }

    setCompanyPhoneCode(userPhoneCode);
    setField("companyPhone", userPhone);
  }, [sameCompanyPhone, userPhoneCode, userPhone, setField]);

  // Validate email confirmation on blur or after 0.5s of inactivity
  useEffect(() => {
    if (emailConfirmTimeoutRef.current) {
      clearTimeout(emailConfirmTimeoutRef.current);
    }

    if (emailConfirm) {
      emailConfirmTimeoutRef.current = setTimeout(() => {
        if (emailConfirm !== store.email) {
          setEmailConfirmError("Adresy email nie zgadzają się");
        } else {
          setEmailConfirmError("");
        }
      }, 500);
    }

    return () => {
      if (emailConfirmTimeoutRef.current) {
        clearTimeout(emailConfirmTimeoutRef.current);
      }
    };
  }, [emailConfirm, store.email]);

  // Update password strength
  useEffect(() => {
    const strength = checkPasswordStrength(store.password);
    setPasswordStrength(strength);
  }, [store.password]);

  async function handleBusinessLookup() {
    if (!store.companyName.trim()) {
      store.setError("Podaj nazwe firmy przed wyszukaniem w Google.");
      return;
    }

    store.setError(null);
    store.setLookupState({ isLookupLoading: true });
    setLookupMessage(null);

    try {
      const params = new URLSearchParams({ query: store.companyName.trim() });
      if (store.companyCity.trim()) {
        params.set("city", store.companyCity.trim());
      }

      const response = await fetch(`/api/business/google-lookup?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Nie udalo sie pobrac danych firmy.");
      }

      store.setLookupState({
        results: data.results ?? [],
        lookupEnabled: Boolean(data.enabled),
        isLookupLoading: false,
      });

      if (!data.enabled) {
        setLookupMessage("Google Places API nie jest jeszcze skonfigurowane. Mozesz wpisac dane firmy recznie.");
      } else if ((data.results ?? []).length === 0) {
        setLookupMessage("Brak dopasowan. Zweryfikuj nazwe firmy lub uzupelnij dane recznie.");
      }
    } catch (error) {
      store.setLookupState({ isLookupLoading: false });
      store.setError(error instanceof Error ? error.message : "Nie udalo sie pobrac danych firmy.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validate email confirmation
    if (emailConfirm !== store.email) {
      setEmailConfirmError("Adresy email nie zgadzają się");
      return;
    }

    // Validate password strength
    if (!passwordStrength.isStrong) {
      store.setError("Hasło musi być silne. " + passwordStrength.feedback.join(", "));
      return;
    }

    store.setSubmitting(true);
    store.setError(null);

    try {
      const normalizedUserPhone = store.phone.trim()
        ? `${userPhoneCode} ${store.phone.trim()}`
        : "";
      const normalizedCompanyPhone = sameCompanyPhone
        ? normalizedUserPhone
        : store.companyPhone.trim()
          ? `${companyPhoneCode} ${store.companyPhone.trim()}`
          : "";
      const normalizedCompanyEmail = sameCompanyEmail ? store.email.trim() : store.companyEmail.trim();

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountType: store.accountType,
          email: store.email,
          username: store.username,
          firstName: store.firstName,
          lastName: store.lastName,
          phone: normalizedUserPhone || undefined,
          password: store.password,
          confirmPassword: store.confirmPassword,
          marketingConsent: store.marketingConsent,
          company:
            store.accountType === "COMPANY"
              ? {
                  name: store.companyName,
                  nip: store.companyNip,
                  email: normalizedCompanyEmail || undefined,
                  phone: normalizedCompanyPhone || undefined,
                  address: store.companyAddress,
                  zipCode: store.companyZipCode,
                  city: store.companyCity,
                  googlePlaceId: store.googlePlaceId,
                  googleMapsUrl: store.googleMapsUrl,
                  acceptedTerms: store.companyAcceptedTerms,
                  marketingConsent: store.companyMarketingConsent,
                }
              : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Rejestracja nie powiodla sie.");
      }

      setRegisteredEmail(store.email);
      setShowConfirmation(true);
      store.setField("password", "");
      store.setField("confirmPassword", "");
      setEmailConfirm("");
    } catch (error) {
      store.setError(error instanceof Error ? error.message : "Rejestracja nie powiodla sie.");
    } finally {
      store.setSubmitting(false);
    }
  }

  if (showConfirmation) {
    return (
      <RegistrationConfirmation
        email={registeredEmail}
        onClose={() => {
          setShowConfirmation(false);
          store.reset();
        }}
      />
    );
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            store.accountType === "PRIVATE"
              ? "border-amber-500 bg-amber-50 text-amber-950"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          onClick={() => store.setField("accountType", "PRIVATE")}
          type="button"
        >
          <div className="text-sm font-semibold">Osoba prywatna</div>
          <div className="mt-1 text-xs text-slate-500">Kupuj, sprzedawaj i rozmawiaj bez konta firmowego.</div>
        </button>
        <button
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            store.accountType === "COMPANY"
              ? "border-amber-500 bg-amber-50 text-amber-950"
              : "border-slate-200 bg-white text-slate-700"
          }`}
          onClick={() => store.setField("accountType", "COMPANY")}
          type="button"
        >
          <div className="text-sm font-semibold">Konto firmowe</div>
          <div className="mt-1 text-xs text-slate-500">Dla firm i przedsiebiorcow z mozliwoscia weryfikacji danych.</div>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <Input autoComplete="email" onChange={(event) => store.setField("email", event.target.value)} required type="email" value={store.email} />
        </Field>
        <Field label="Potwierdź email" error={emailConfirmError}>
          <Input
            autoComplete="off"
            onChange={(event) => setEmailConfirm(event.target.value)}
            onBlur={() => {
              if (emailConfirm && emailConfirm !== store.email) {
                setEmailConfirmError("Adresy email nie zgadzają się");
              }
            }}
            required
            type="email"
            value={emailConfirm}
            placeholder="Wpisz email ponownie"
          />
        </Field>
        <Field label="Preferowana nazwa uzytkownika">
          <Input autoComplete="username" onChange={(event) => store.setField("username", event.target.value)} required value={store.username} />
        </Field>
        <Field label="Imie">
          <Input onChange={(event) => store.setField("firstName", event.target.value)} value={store.firstName} />
        </Field>
        <Field label="Nazwisko">
          <Input onChange={(event) => store.setField("lastName", event.target.value)} value={store.lastName} />
        </Field>
        <Field label="Telefon">
          <div className="flex gap-2">
            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              onChange={(event) => setUserPhoneCode(event.target.value)}
              value={userPhoneCode}
            >
              {COUNTRY_DIAL_CODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <Input
              onChange={(event) => store.setField("phone", event.target.value)}
              placeholder={t("Numer bez kierunkowego", "Phone without country code")}
              value={store.phone}
            />
          </div>
        </Field>
      </div>

      {/* Password Section */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
        <h3 className="text-base font-semibold text-slate-900">Siła hasła</h3>
        <p className="mt-1 text-sm text-slate-500">Hasło musi być silne dla bezpieczeństwa Twojego konta</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Hasło">
            <Input autoComplete="new-password" onChange={(event) => store.setField("password", event.target.value)} required type="password" value={store.password} placeholder="Minimum 8 znaków" />
          </Field>
          <Field label="Potwierdź hasło">
            <Input autoComplete="new-password" onChange={(event) => store.setField("confirmPassword", event.target.value)} required type="password" value={store.confirmPassword} placeholder="Powtórz hasło" />
          </Field>
        </div>

        {/* Password Strength Indicator */}
        {store.password && (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Siła hasła:</span>
                <span className={`text-sm font-bold ${passwordStrength.score <= 1 ? "text-red-600" : passwordStrength.score === 2 ? "text-orange-600" : "text-green-600"}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{
                    width: `${((passwordStrength.score + 1) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>

            {passwordStrength.feedback.length > 0 && (
              <div className="space-y-1">
                {passwordStrength.feedback.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {passwordStrength.isStrong && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Hasło jest wystarczająco silne
              </div>
            )}
          </div>
        )}
      </div>

      {store.accountType === "COMPANY" ? (
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Dane firmy</h3>
              <p className="mt-1 text-sm text-slate-500">Mozesz wpisac dane recznie albo sprobowac pobrac je z Google Places. Avatar i opis działalności ustawisz później w opcjach konta.</p>
            </div>
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              onClick={handleBusinessLookup}
              type="button"
            >
              {store.isLookupLoading ? "Szukam..." : "Pobierz z Google"}
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa firmy">
              <Input onChange={(event) => store.setField("companyName", event.target.value)} required value={store.companyName} />
            </Field>
            <Field label="NIP">
              <Input onChange={(event) => store.setField("companyNip", event.target.value)} value={store.companyNip} />
            </Field>
            <Field label="Email firmowy">
              <Input
                disabled={sameCompanyEmail}
                onChange={(event) => store.setField("companyEmail", event.target.value)}
                type="email"
                value={sameCompanyEmail ? store.email : store.companyEmail}
              />
            </Field>
            <Field label="Telefon firmowy">
              <div className="flex gap-2">
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  disabled={sameCompanyPhone}
                  onChange={(event) => setCompanyPhoneCode(event.target.value)}
                  value={sameCompanyPhone ? userPhoneCode : companyPhoneCode}
                >
                  {COUNTRY_DIAL_CODES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <Input
                  disabled={sameCompanyPhone}
                  onChange={(event) => store.setField("companyPhone", event.target.value)}
                  placeholder={t("Numer bez kierunkowego", "Phone without country code")}
                  value={sameCompanyPhone ? store.phone : store.companyPhone}
                />
              </div>
            </Field>
            <Field label="Miasto">
              <Input onChange={(event) => store.setField("companyCity", event.target.value)} value={store.companyCity} />
            </Field>
            <Field label="Kod pocztowy">
              <Input onChange={(event) => store.setField("companyZipCode", event.target.value)} value={store.companyZipCode} />
            </Field>
            <Field label="Adres">
              <Input onChange={(event) => store.setField("companyAddress", event.target.value)} value={store.companyAddress} />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              <input
                checked={sameCompanyEmail}
                className="mt-1 h-4 w-4"
                onChange={(event) => setSameCompanyEmail(event.target.checked)}
                type="checkbox"
              />
              <span>{t("Uzyj tego samego emaila dla firmy", "Use the same email for company")}</span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              <input
                checked={sameCompanyPhone}
                className="mt-1 h-4 w-4"
                onChange={(event) => setSameCompanyPhone(event.target.checked)}
                type="checkbox"
              />
              <span>{t("Uzyj tego samego telefonu dla firmy", "Use the same phone for company")}</span>
            </label>
          </div>

          {lookupMessage ? <p className="mt-4 text-sm text-slate-500">{lookupMessage}</p> : null}

          {store.lookupResults.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {store.lookupResults.map((result) => (
                <button
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-500"
                  key={result.id}
                  onClick={() => store.applyBusinessLookupResult(result)}
                  type="button"
                >
                  <div className="font-semibold text-slate-900">{result.name}</div>
                  <div className="mt-1 text-sm text-slate-500">{result.address}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">{result.businessStatus ?? "UNKNOWN"}</div>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <input checked={store.marketingConsent} className="mt-1 h-4 w-4" onChange={(event) => store.setField("marketingConsent", event.target.checked)} type="checkbox" />
        <span>Zgadzam sie na komunikacje marketingowa dotyczaca promocji i nowych funkcji.</span>
      </label>

      {store.accountType === "COMPANY" ? (
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <input checked={store.companyAcceptedTerms} className="mt-1 h-4 w-4" onChange={(event) => store.setField("companyAcceptedTerms", event.target.checked)} type="checkbox" />
          <span>Potwierdzam, ze rejestruje konto jako przedsiebiorca i akceptuje warunki dla kont firmowych.</span>
        </label>
      ) : null}

      {store.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{store.error}</div> : null}

      <button
        className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={store.isSubmitting || !passwordStrength.isStrong || !!emailConfirmError}
        type="submit"
      >
        {store.isSubmitting ? "Tworze konto..." : "Utworz konto"}
      </button>

      <a
        className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
        href="/api/auth/google/start"
      >
        Kontynuuj z Google
      </a>

      <p className="text-sm text-slate-500">
        Masz juz konto? <Link className="font-semibold text-slate-950" href="/auth/login">Zaloguj sie</Link>
      </p>
    </form>
  );
}
