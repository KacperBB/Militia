import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Prisma } from "@prisma/client";

import { AdSlot } from "@/components/adsense/ad-slot";
import { FavoritePostButton } from "@/components/posts/favorite-post-button";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { POST_STATUSES, applyPostLifecycle } from "@/lib/posts/status";

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

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  await applyPostLifecycle();
  const { q, category } = await searchParams;
  const query = q?.trim() ?? "";
  const selectedCategoryId = category?.trim() || null;

  const session = await getCurrentSession();
  const baseWhere: Prisma.postsWhereInput = {
    status: POST_STATUSES.PUBLISHED,
    deleted_at: null,
  };

  const postsWhere: Prisma.postsWhereInput = {
    ...baseWhere,
    ...(query
      ? {
          title: {
            contains: query,
            mode: "insensitive",
          },
        }
      : {}),
    ...(selectedCategoryId ? { category_id: selectedCategoryId } : {}),
  };

  const posts = await db.posts.findMany({
    where: postsWhere,
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

  const groupedByCategory = await db.posts.groupBy({
    by: ["category_id"],
    where: baseWhere,
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        category_id: "desc",
      },
    },
  });

  const categoryIds = groupedByCategory.map((item) => item.category_id);
  const categories = categoryIds.length
    ? await db.categories.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const categoryItems = groupedByCategory
    .map((item) => {
      const categoryData = categoryMap.get(item.category_id);
      if (!categoryData) {
        return null;
      }

      return {
        id: categoryData.id,
        name: categoryData.name,
        count: item._count._all,
      };
    })
    .filter((item): item is { id: string; name: string; count: number } => Boolean(item));

  const postIds = posts.map((post) => post.id);
  const favoriteIds = session && postIds.length > 0
    ? await db.favorites.findMany({
        where: {
          user_id: session.user.id,
          post_id: { in: postIds },
        },
        select: { post_id: true },
      })
    : [];
  const favoriteSet = new Set(favoriteIds.map((favorite) => favorite.post_id));

  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_LISTINGS || "";
  const inlineAdSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_LISTINGS_INLINE || "";

  const createListingFilterHref = (categoryId: string | null) => {
    const params = new URLSearchParams();
    if (query) {
      params.set("q", query);
    }
    if (categoryId) {
      params.set("category", categoryId);
    }
    const encoded = params.toString();
    return encoded ? `/ogloszenia?${encoded}` : "/ogloszenia";
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Ogłoszenia</h1>
            <p className="mt-1 text-sm text-slate-600">Najnowsze opublikowane oferty w serwisie.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <form action="/ogloszenia" method="get" className="flex w-full gap-2 md:max-w-xl">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Szukaj po nazwie ogłoszenia"
                className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
              />
              {selectedCategoryId ? <input type="hidden" name="category" value={selectedCategoryId} /> : null}
              <button
                type="submit"
                className="rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Szukaj
              </button>
            </form>

            {session ? (
              <Link
                href="/ogloszenia/dodaj"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Dodaj ogłoszenie
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {adSlot ? <AdSlot slot={adSlot} className="min-h-22.5" /> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-4 lg:h-fit">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kategorie</p>
        <div className="mt-3 space-y-1">
          <Link
            href={createListingFilterHref(null)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
              !selectedCategoryId ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Wszystkie</span>
            <span className={`text-xs ${!selectedCategoryId ? "text-slate-200" : "text-slate-500"}`}>{groupedByCategory.reduce((acc, item) => acc + item._count._all, 0)}</span>
          </Link>
          {categoryItems.map((categoryItem) => (
            <Link
              key={categoryItem.id}
              href={createListingFilterHref(categoryItem.id)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                selectedCategoryId === categoryItem.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate pr-3">{categoryItem.name}</span>
              <span className={`text-xs ${selectedCategoryId === categoryItem.id ? "text-slate-200" : "text-slate-500"}`}>
                {categoryItem.count}
              </span>
            </Link>
          ))}
        </div>
      </aside>

      <section className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Brak opublikowanych ogłoszeń.
          </div>
        ) : (
          posts.flatMap((post, index) => {
            const items = [
              <article key={post.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="flex gap-4">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {resolveImageSource(post.images[0]?.storage_key) ? (
                        <Image
                          src={resolveImageSource(post.images[0]?.storage_key) || ""}
                          alt={post.title}
                          width={112}
                          height={112}
                          sizes="112px"
                          className="h-full w-full object-cover"
                        />
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
                    <div className="mt-3">
                      <FavoritePostButton
                        postId={post.id}
                        initialIsFavorited={favoriteSet.has(post.id)}
                        disabled={!session || session.user.id === post.created_by}
                        disabledReason={!session ? "login-required" : session.user.id === post.created_by ? "own-listing" : null}
                      />
                    </div>
                  </div>
                </div>
              </article>,
            ];

            if (inlineAdSlot && (index + 1) % 8 === 0) {
              items.push(
                <AdSlot
                  key={`inline-ad-${post.id}`}
                  slot={inlineAdSlot}
                  className="min-h-22.5"
                  format="auto"
                  responsive
                />,
              );
            }

            return items;
          })
        )}
      </section>
      </div>
    </main>
  );
}
