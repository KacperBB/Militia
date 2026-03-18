"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Nie udalo sie wyslac resetu hasla.");
      }

      setSuccess(data.message ?? "Sprawdz skrzynke email.");
      if (data.preview?.mode === "dev") {
        setPreview(data.preview.previewFile ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udalo sie wyslac resetu hasla.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-medium">Email konta</span>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div>{success}</div>
          {preview ? <div className="mt-1 text-xs">Dev preview: {preview}</div> : null}
        </div>
      ) : null}

      <button
        className="h-12 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Wysylam..." : "Wyslij link resetujacy"}
      </button>

      <p className="text-sm text-slate-500">
        Pamietasz haslo? <Link className="font-semibold text-slate-950" href="/auth/login">Wroc do logowania</Link>
      </p>
    </form>
  );
}
