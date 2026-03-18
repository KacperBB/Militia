"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { useAuthLoginStore } from "@/stores/auth-login-store";

export function LoginForm() {
  const router = useRouter();
  const store = useAuthLoginStore();
  const { t } = useLocale();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    store.setSubmitting(true);
    store.setError(null);
    store.setSuccess(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: store.identifier,
          password: store.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? t("login.form.error", "Sign-in failed."));
      }

      store.setSuccess(t("login.form.success", "Signed in successfully."));
      window.dispatchEvent(new Event("militia-auth-changed"));
      router.push("/");
      router.refresh();
    } catch (error) {
      store.setError(error instanceof Error ? error.message : t("login.form.error", "Sign-in failed."));
    } finally {
      store.setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-medium">{t("login.form.identifier", "Email or username")}</span>
        <input
          autoComplete="username"
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          onChange={(event) => store.setField("identifier", event.target.value)}
          required
          value={store.identifier}
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-medium">{t("login.form.password", "Password")}</span>
        <input
          autoComplete="current-password"
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          onChange={(event) => store.setField("password", event.target.value)}
          required
          type="password"
          value={store.password}
        />
      </label>

      <p className="-mt-2 text-sm text-slate-500">
        {t("login.form.forgot", "Forgot your password?")} <Link className="font-semibold text-slate-950" href="/auth/forgot-password">{t("login.form.reset", "Reset password")}</Link>
      </p>

      {store.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{store.error}</div> : null}
      {store.success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{store.success}</div> : null}

      <button
        className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={store.isSubmitting}
        type="submit"
      >
        {store.isSubmitting
          ? t("login.form.submitting", "Signing in...")
          : t("login.form.submit", "Log in")}
      </button>

      <a
        className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:text-slate-950"
        href="/api/auth/google/start"
      >
        {t("login.form.google", "Continue with Google")}
      </a>

      <p className="text-sm text-slate-500">
        {t("login.form.noAccount", "No account yet?")} <Link className="font-semibold text-slate-950" href="/auth/register">{t("login.form.register", "Register")}</Link>
      </p>
    </form>
  );
}
