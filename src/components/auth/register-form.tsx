"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { useAuthRegisterStore } from "@/stores/auth-register-store";
import type { BusinessLookupItem } from "@/stores/auth-register-store";
import { checkPasswordStrength, type PasswordStrength } from "@/lib/auth/password-strength";
import {
  getRegisterWizardSteps,
  validateRegisterWizardStep,
  type RegisterWizardStep,
} from "@/lib/auth/register-wizard";
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

function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="mt-1 block text-sm text-slate-500">{description}</span>
      </span>
      <span
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-amber-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
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
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [selectedLookupId, setSelectedLookupId] = useState<string | null>(null);
  const [lookupResults, setLookupResults] = useState<BusinessLookupItem[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showStepErrors, setShowStepErrors] = useState(false);
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

  const steps = getRegisterWizardSteps(store.accountType);
  const currentStep = steps[currentStepIndex] ?? steps[0];

  useEffect(() => {
    setCurrentStepIndex((current) => Math.min(current, steps.length - 1));
  }, [steps.length]);

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

    if (!store.companyCity.trim()) {
      store.setError("Podaj miasto firmy przed wyszukaniem (dla sieci handlowych to obowiazkowe).");
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

      const results = (data.results ?? []) as BusinessLookupItem[];
      setLookupResults(results);

      if (results.length > 0) {
        const firstId = results[0]?.id ?? null;
        setSelectedLookupId(firstId);
        setIsLookupModalOpen(true);
        setLookupMessage(data.reason ?? null);
      } else if (!data.enabled) {
        setLookupMessage("Nie udało się pobrać danych firmy. Możesz uzupełnić je ręcznie.");
      } else if (results.length === 0) {
        setLookupMessage(
          "Brak dopasowan. Spróbuj krótszej nazwy firmy i miasta w mianowniku (np. Rzeszów), albo uzupełnij dane ręcznie.",
        );
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
      const normalizedGoogleMapsUrl = store.googleMapsUrl.trim();

      const validGoogleMapsUrl = (() => {
        if (!normalizedGoogleMapsUrl) {
          return undefined;
        }

        try {
          return new URL(normalizedGoogleMapsUrl).toString();
        } catch {
          return undefined;
        }
      })();

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
                  googleMapsUrl: validGoogleMapsUrl,
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

  const selectedLookup = lookupResults.find((result) => result.id === selectedLookupId) ?? null;
  const selectedMapUrl =
    selectedLookup?.lat && selectedLookup?.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedLookup.lng - 0.03}%2C${selectedLookup.lat - 0.02}%2C${selectedLookup.lng + 0.03}%2C${selectedLookup.lat + 0.02}&layer=mapnik&marker=${selectedLookup.lat}%2C${selectedLookup.lng}`
      : null;

  const wizardValidation = validateRegisterWizardStep(
    currentStep as RegisterWizardStep,
    {
      accountType: store.accountType,
      email: store.email,
      emailConfirm,
      username: store.username,
      firstName: store.firstName,
      lastName: store.lastName,
      phone: store.phone,
      password: store.password,
      confirmPassword: store.confirmPassword,
      companyName: store.companyName,
      companyNip: store.companyNip,
      companyEmail: store.companyEmail,
      companyPhone: store.companyPhone,
      companyCity: store.companyCity,
      companyAcceptedTerms: store.companyAcceptedTerms,
      sameCompanyEmail,
      sameCompanyPhone,
    },
    passwordStrength,
  );

  const fieldErrors = showStepErrors ? wizardValidation.errors : {};

  function stepTitle(step: RegisterWizardStep) {
    switch (step) {
      case "accountType":
        return t("Typ konta", "Account type");
      case "identity":
        return t("Dane konta", "Account details");
      case "company":
        return t("Dane firmy", "Company details");
      case "security":
        return t("Bezpieczeństwo", "Security");
    }
  }

  function handleNextStep() {
    setShowStepErrors(true);
    if (!wizardValidation.canContinue) {
      return;
    }
    setShowStepErrors(false);
    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function handlePreviousStep() {
    setShowStepErrors(false);
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
              currentStep === step
                ? "bg-slate-900 text-white"
                : index < currentStepIndex
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            <span className="font-semibold">{index + 1}</span>
            <span>{stepTitle(step)}</span>
          </div>
        ))}
      </div>

      {currentStep === "accountType" ? (
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
      ) : null}

      {currentStep === "identity" ? (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <Input autoComplete="email" onChange={(event) => store.setField("email", event.target.value)} required type="email" value={store.email} />
          {fieldErrors.email ? <span className="text-xs text-rose-600">{fieldErrors.email}</span> : null}
        </Field>
        <Field label="Potwierdź email" error={fieldErrors.emailConfirm || emailConfirmError}>
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
        <Field label="Preferowana nazwa uzytkownika" error={fieldErrors.username}>
          <Input autoComplete="username" onChange={(event) => store.setField("username", event.target.value)} required value={store.username} />
        </Field>
        <Field label="Imie">
          <Input onChange={(event) => store.setField("firstName", event.target.value)} value={store.firstName} />
        </Field>
        <Field label="Nazwisko">
          <Input onChange={(event) => store.setField("lastName", event.target.value)} value={store.lastName} />
        </Field>
        <Field label="Telefon" error={fieldErrors.phone}>
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
      ) : null}

      {currentStep === "security" ? (
      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
        <h3 className="text-base font-semibold text-slate-900">Siła hasła</h3>
        <p className="mt-1 text-sm text-slate-500">Hasło musi być silne dla bezpieczeństwa Twojego konta</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Hasło" error={fieldErrors.password}>
            <Input autoComplete="new-password" onChange={(event) => store.setField("password", event.target.value)} required type="password" value={store.password} placeholder="Minimum 8 znaków" />
          </Field>
          <Field label="Potwierdź hasło" error={fieldErrors.confirmPassword}>
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
      ) : null}

      {currentStep === "company" && store.accountType === "COMPANY" ? (
        <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Dane firmy</h3>
              <p className="mt-1 text-sm text-slate-500">Mozesz wpisac dane recznie albo sprobowac pobrac je z Google Places. Avatar i opis działalności ustawisz później w opcjach konta.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa firmy" error={fieldErrors.companyName}>
              <Input onChange={(event) => store.setField("companyName", event.target.value)} required value={store.companyName} />
            </Field>
            <Field label="Miasto" error={fieldErrors.companyCity}>
              <Input onChange={(event) => store.setField("companyCity", event.target.value)} value={store.companyCity} />
            </Field>
          </div>

          <div className="mt-4">
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
              onClick={handleBusinessLookup}
              type="button"
            >
              {store.isLookupLoading ? "Szukam..." : "Pobierz z Google"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="NIP" error={fieldErrors.companyNip}>
              <Input onChange={(event) => store.setField("companyNip", event.target.value)} value={store.companyNip} />
            </Field>
            <Field label="Email firmowy" error={fieldErrors.companyEmail}>
              <Input
                disabled={sameCompanyEmail}
                onChange={(event) => store.setField("companyEmail", event.target.value)}
                type="email"
                value={sameCompanyEmail ? store.email : store.companyEmail}
              />
            </Field>
            <Field label="Telefon firmowy" error={fieldErrors.companyPhone}>
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
            <Field label="Kod pocztowy">
              <Input onChange={(event) => store.setField("companyZipCode", event.target.value)} value={store.companyZipCode} />
            </Field>
            <Field label="Adres">
              <Input onChange={(event) => store.setField("companyAddress", event.target.value)} value={store.companyAddress} />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Switch
              checked={sameCompanyEmail}
              onChange={setSameCompanyEmail}
              label={t("Uzyj tego samego emaila dla firmy", "Use the same email for company")}
              description={t("Skopiuj email konta osobistego do danych firmowych.", "Copy personal account email into company details.")}
            />
            <Switch
              checked={sameCompanyPhone}
              onChange={setSameCompanyPhone}
              label={t("Uzyj tego samego telefonu dla firmy", "Use the same phone for company")}
              description={t("Skopiuj numer telefonu z konta osobistego do firmy.", "Copy personal phone number into company details.")}
            />
          </div>

          {lookupMessage ? <p className="mt-4 text-sm text-slate-500">{lookupMessage}</p> : null}

          {lookupResults.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900">
              <p className="font-semibold">Znaleziono firmy w Google Maps</p>
              <p className="mt-1">Wybierz firmę z mapy, aby automatycznie uzupełnić dane.</p>
              <button
                className="mt-3 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                onClick={() => setIsLookupModalOpen(true)}
                type="button"
              >
                Otwórz mapę i wybierz firmę
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isLookupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Wybierz firmę na mapie</h3>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setIsLookupModalOpen(false)}
                type="button"
              >
                Zamknij
              </button>
            </div>

            <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
              <div className="max-h-[62vh] overflow-y-auto border-r border-slate-200 p-4">
                <div className="grid gap-3">
                  {lookupResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setSelectedLookupId(result.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedLookupId === result.id
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 bg-white hover:border-amber-300"
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{result.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{result.address || "Brak adresu"}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">{result.businessStatus ?? "UNKNOWN"}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {selectedLookup ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">{selectedLookup.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedLookup.address || "Brak adresu"}</p>

                    <div className="mt-3 h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {selectedMapUrl ? (
                        <iframe
                          title="Podgląd mapy firmy"
                          src={selectedMapUrl}
                          className="h-full w-full"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                          Brak wspolrzednych mapy dla tej firmy.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        onClick={() => {
                          const picked = lookupResults.find((result) => result.id === selectedLookupId);
                          if (!picked) {
                            return;
                          }
                          store.applyBusinessLookupResult(picked);
                          setIsLookupModalOpen(false);
                        }}
                        type="button"
                      >
                        Wybierz tę firmę
                      </button>
                      {selectedLookup.googleMapsUrl ? (
                        <a
                          href={selectedLookup.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Otwórz w Google Maps
                        </a>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full min-h-64 items-center justify-center text-sm text-slate-500">
                    Wybierz firmę z listy po lewej.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {currentStep === "security" ? <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <input checked={store.marketingConsent} className="mt-1 h-4 w-4" onChange={(event) => store.setField("marketingConsent", event.target.checked)} type="checkbox" />
        <span>Zgadzam sie na komunikacje marketingowa dotyczaca promocji i nowych funkcji.</span>
      </label> : null}

      {currentStep === "security" && store.accountType === "COMPANY" ? (
        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <input checked={store.companyAcceptedTerms} className="mt-1 h-4 w-4" onChange={(event) => store.setField("companyAcceptedTerms", event.target.checked)} type="checkbox" />
          <span>Potwierdzam, ze rejestruje konto jako przedsiebiorca i akceptuje warunki dla kont firmowych.</span>
          {fieldErrors.companyAcceptedTerms ? <span className="text-xs text-rose-600">{fieldErrors.companyAcceptedTerms}</span> : null}
        </label>
      ) : null}

      {store.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{store.error}</div> : null}

      <div className="flex flex-wrap gap-3">
        {currentStepIndex > 0 ? (
          <button
            className="h-12 rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
            onClick={handlePreviousStep}
            type="button"
          >
            Wstecz
          </button>
        ) : null}

        {currentStepIndex < steps.length - 1 ? (
          <button
            className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={handleNextStep}
            type="button"
          >
            Dalej
          </button>
        ) : (
          <button
            className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={store.isSubmitting || !passwordStrength.isStrong || !!emailConfirmError}
            type="submit"
          >
            {store.isSubmitting ? "Tworze konto..." : "Utworz konto"}
          </button>
        )}
      </div>

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
