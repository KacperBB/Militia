import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/adsense/ad-slot";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Ogłoszenia | Militia",
  description: "Najnowsze ogłoszenia sprzedaży. Przeglądaj oferty elektroniki, mebli, motoryzacji i więcej na Militia.",
  openGraph: {
    title: "Ogłoszenia | Militia",
    description: "Najnowsze ogłoszenia sprzedaży. Przeglądaj oferty elektroniki, mebli, motoryzacji i więcej.",
    type: "website",
  },
};

function resolveImageSource(storageKey: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://") || storageKey.startsWith("/")) {
    return storageKey;
  }

  return null;
}

function formatPrice(priceCents: number | null, currency: string) {
  if (priceCents === null) {
    return "-";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

export default async function ListingsPage() {
  const session = await getCurrentSession();
  const posts = await db.posts.findMany({
    where: {
      status: "PUBLISHED",
      deleted_at: null,
    },
    orderBy: [{ is_promoted: "desc" }, { published_at: "desc" }, { created_at: "desc" }],
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatar_url: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      images: {
        orderBy: {
          sort_order: "asc",
        },
        take: 1,
        select: {
          storage_key: true,
        },
      },
    },
    take: 60,
  });

  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_LISTINGS || "";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ogłoszenia</h1>
            <p className="mt-1 text-sm text-slate-600">Najnowsze opublikowane oferty w serwisie.</p>
          </div>
          {session ? (
            <Link
              href="/ogloszenia/dodaj"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Dodaj ogłoszenie
            </Link>
          ) : null}
        </div>
      </header>

      {adSlot ? <AdSlot slot={adSlot} className="min-h-22.5" /> : null}

      <section className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Brak opublikowanych ogłoszeń.
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex gap-4">
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {resolveImageSource(post.images[0]?.storage_key) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveImageSource(post.images[0]?.storage_key) || ""} alt={post.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 px-3 text-center text-xs font-medium text-slate-500">
                        Brak zdjecia
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {post.category.name}
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">
                      <Link href={`/ogloszenia/${post.id}`} className="hover:text-amber-700">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="line-clamp-3 text-sm text-slate-700">{post.description}</p>
                    <div className="text-sm font-semibold text-emerald-700">{formatPrice(post.price_cents, post.currency)}</div>
                        <div className="text-xs text-slate-500">{post.city || "-"}</div>
                        <div className="text-xs font-medium text-slate-600">Wyświetlenia: {post.views_count}</div>
                  </div>
                </div>

                <div className="min-w-55 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Autor</p>
                  <Link href={`/u/${post.author.id}`} className="mt-2 flex items-center gap-2 hover:text-amber-700">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-700">
                      {(post.author.username ?? "U").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{post.author.username ?? "Użytkownik"}</span>
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString("pl-PL")}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
