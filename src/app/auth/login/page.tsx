"use client";

import { LoginForm } from "@/components/auth/login-form";
import { useLocale } from "@/components/providers/locale-provider";

export default function LoginPage() {
  const { t } = useLocale();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-4xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">{t("login.badge", "Authorization")}</div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("login.title", "Log in to Militia")}</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{t("login.subtitle", "You can sign in with email or username. Unverified email blocks session start, improving security from day one.")}</p>
          <div className="mt-8">
            <LoginForm />
          </div>
        </section>
        <section className="rounded-4xl bg-slate-950 px-8 py-10 text-white shadow-[0_30px_120px_rgba(15,23,42,0.28)]">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">{t("login.why", "Why this approach")}</div>
          <div className="mt-6 grid gap-4 text-sm leading-7 text-slate-300">
            <p>{t("login.why.1", "The session lives in the database, while the cookie stores only a random token. Its hash is persisted server-side.")}</p>
            <p>{t("login.why.2", "This allows revoking a specific session, invalidating active logins, and keeping a full audit trail.")}</p>
            <p>{t("login.why.3", "This model is simpler and more controllable at the beginning than distributed JWT without central invalidation.")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
