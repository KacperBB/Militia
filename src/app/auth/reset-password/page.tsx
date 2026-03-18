import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-6 py-10 text-slate-950">
      <section className="w-full max-w-2xl rounded-4xl border border-white/70 bg-white/95 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Nowe haslo</div>
        <h1 className="mt-2 text-3xl font-semibold">Ustaw bezpieczne haslo</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Po zmianie hasla wszystkie aktywne sesje zostana uniewaznione i wymagane bedzie ponowne logowanie.</p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-slate-600">Ladowanie formularza resetu hasla...</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
