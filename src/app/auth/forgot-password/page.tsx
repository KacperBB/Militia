import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.15),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
      <section className="w-full max-w-2xl rounded-4xl border border-white/70 bg-white/95 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Reset hasla</div>
        <h1 className="mt-2 text-3xl font-semibold">Odzyskaj dostep</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Wyslemy jednorazowy link resetujacy. Dla ochrony prywatnosci zawsze dostaniesz ten sam komunikat, niezaleznie czy konto istnieje.</p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
