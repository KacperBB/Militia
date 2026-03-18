import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_35%),linear-gradient(180deg,#fffdf7_0%,#f8fafc_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-4xl bg-slate-950 px-8 py-10 text-white shadow-[0_30px_120px_rgba(15,23,42,0.28)]">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Militia Auth</div>
          <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight">Rejestracja konta prywatnego lub firmowego w stylu marketplace.</h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-slate-300">
            Budujemy od razu prawidlowy przeplyw: preferowana nazwa uzytkownika, silne haslo, weryfikacja email przez SMTP, konto firmowe z lookupem Google i sesja po potwierdzeniu adresu.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-slate-300">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Hasla, tokeny weryfikacyjne i tokeny sesji sa hashowane po stronie serwera.</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Konto firmowe moze zostac uzupelnione danymi z Google Places jako wsparcie onboardingowe.</div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">Po potwierdzeniu emaila uzytkownik dostaje aktywna sesje i moze od razu wejsc do aplikacji.</div>
          </div>
        </section>
        <section className="rounded-4xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Start</div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-950">Utworz konto</h2>
          </div>
          <RegisterForm />
        </section>
      </div>
    </main>
  );
}
