"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function VerifyEmailPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [message, setMessage] = useState(token ? "Trwa potwierdzanie adresu email..." : "Brakuje tokenu weryfikacyjnego.");
  const [isError, setIsError] = useState(!token);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    async function verify() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Nie udalo sie potwierdzic adresu email.");
        }

        if (!active) {
          return;
        }

        setMessage("Email potwierdzony. Mozesz korzystac z konta.");
        setIsError(false);
        router.refresh();
      } catch (error) {
        if (!active) {
          return;
        }

        setMessage(error instanceof Error ? error.message : "Nie udalo sie potwierdzic adresu email.");
        setIsError(true);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [router, token]);

  return (
    <div className="rounded-4xl border border-slate-200 bg-white/95 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${isError ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
        {isLoading ? "Weryfikacja" : isError ? "Blad" : "Gotowe"}
      </div>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">Potwierdzenie adresu email</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" href="/auth/login">
          Przejdz do logowania
        </Link>
        <Link className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950" href="/auth/register">
          Powrot do rejestracji
        </Link>
      </div>
    </div>
  );
}
