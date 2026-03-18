"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";

type HomeSessionUser = {
  email: string;
  username: string | null;
  role: string;
};

type HomePageContentProps = {
  user: HomeSessionUser | null;
};

export function HomePageContent({ user }: HomePageContentProps) {
  const { t } = useLocale();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-4xl bg-slate-950 px-8 py-10 text-white shadow-[0_30px_120px_rgba(15,23,42,0.28)]">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">Militia</div>
          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-tight">{t("home.hero.title", "An OLX-style marketplace with auth, company profiles, and secure onboarding from day one.")}</h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300">{t("home.hero.body", "You already have a PostgreSQL + Prisma foundation, test seeds, and a full registration/login flow with email verification, company accounts, and Google sign-in.")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            {!user && (
              <>
                <Link className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300" href="/auth/register">
                  {t("home.cta.register", "Create account")}
                </Link>
                <Link className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/50" href="/auth/login">
                  {t("home.cta.login", "Log in")}
                </Link>
              </>
            )}
            {user && (
              <>
                <Link
                  className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
                  href={`/dashboard/${user.role.toLowerCase()}`}
                >
                  {t("home.cta.dashboard", "Go to dashboard")}
                </Link>
                {user.role === "USER" ? (
                  <Link
                    className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/50"
                    href="/ogloszenia/dodaj"
                  >
                    {t("home.cta.createListing", "Create listing")}
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </section>

        <section className="rounded-4xl border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(148,163,184,0.22)] backdrop-blur">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">{t("home.session.title", "Session status")}</div>
          <h2 className="mt-2 text-3xl font-semibold">
            {user
              ? `${t("home.session.welcome", "Welcome")}, ${user.username ?? user.email}`
              : t("home.session.none", "No active session")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {user
              ? t("home.session.active", "The session is stored in the database, and the cookie holds only a random token. This lets you centrally revoke logins.")
              : t("home.session.inactive", "After registration, you will get a verification email. Once confirmed, your account will sign in automatically.")}
          </p>

          <div className="mt-8 grid gap-4 text-sm text-slate-600">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{t("home.info.hash", "Passwords are hashed in a separate user_credentials table.")}</div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{t("home.info.tokens", "Verification and session tokens are stored as hashes.")}</div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">{t("home.info.company", "Company profile data can be prefilled from Google Places, but registration remains user-controlled.")}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
