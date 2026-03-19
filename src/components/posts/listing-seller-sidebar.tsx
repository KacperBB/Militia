"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FavoritePostButton } from "@/components/posts/favorite-post-button";

type ListingSellerSidebarProps = {
  seller: {
    type: "COMPANY" | "PRIVATE";
    userId: string;
    name: string;
    email: string | null;
    phone: string | null;
    joinedAtLabel: string;
    companyName: string | null;
    companyDescription: string | null;
    nip: string | null;
    address: string | null;
    locationLabel: string | null;
    mapsUrl: string | null;
    postId: string;
  };
  viewer: {
    isFavorited: boolean;
    canFavorite: boolean;
    isAuthenticated: boolean;
  };
};

export function ListingSellerSidebar({ seller, viewer }: ListingSellerSidebarProps) {
  const [showPhone, setShowPhone] = useState(false);

  const canSeeContact = viewer.isAuthenticated;

  const phoneLabel = useMemo(() => {
    if (!canSeeContact) return "Zaloguj się, aby zobaczyć numer";
    if (!seller.phone) return "Brak numeru telefonu";
    return showPhone ? seller.phone : "Pokaż numer telefonu";
  }, [canSeeContact, seller.phone, showPhone]);

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {seller.type === "COMPANY" ? "Sprzedawca firmowy" : "Sprzedawca prywatny"}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-bold text-slate-700">
            {(seller.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <Link href={`/u/${seller.userId}`} className="text-base font-bold text-slate-900 hover:text-amber-700">
              {seller.name}
            </Link>
            <p className="text-sm text-slate-500">{seller.joinedAtLabel}</p>
          </div>
        </div>

        {seller.type === "COMPANY" ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p className="whitespace-pre-line leading-7 text-slate-700">{seller.companyDescription}</p>
            <div className="rounded-xl bg-slate-50 p-4 whitespace-pre-line">
              <p><span className="font-semibold">Nazwa firmy:</span> {seller.companyName}</p>
              {seller.nip && canSeeContact ? <p><span className="font-semibold">NIP:</span> {seller.nip}</p> : null}
              {canSeeContact && seller.email ? <p><span className="font-semibold">E-mail:</span> {seller.email}</p> : null}
              {seller.address ? <p><span className="font-semibold">Adres:</span>{"\n"}{seller.address}</p> : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p><span className="font-semibold">Kontakt:</span> osoba prywatna</p>
            {canSeeContact && seller.email ? <p className="mt-1"><span className="font-semibold">E-mail:</span> {seller.email}</p> : null}
          </div>
        )}

        {!canSeeContact ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Dane kontaktowe</p>
            <p className="mt-1 text-amber-800">
              <a href="/auth/login" className="underline font-semibold hover:text-amber-950">Zaloguj się</a>, aby zobaczyć numer telefonu i e-mail sprzedawcy.
            </p>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              if (canSeeContact) setShowPhone((current) => !current);
            }}
            disabled={canSeeContact && !seller.phone}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phoneLabel}
          </button>

          <FavoritePostButton
            postId={seller.postId}
            initialIsFavorited={viewer.isFavorited}
            disabled={!viewer.canFavorite}
          />
        </div>
      </section>

      {seller.locationLabel ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lokalizacja</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{seller.locationLabel}</p>
          {seller.mapsUrl ? (
            <a href={seller.mapsUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">
              Otworz w mapach
            </a>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
