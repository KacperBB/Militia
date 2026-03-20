import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FavoritePostButton } from "@/components/posts/favorite-post-button";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { POST_STATUSES } from "@/lib/posts/status";

function formatPrice(priceCents: number | null, currency: string) {
  if (priceCents === null || priceCents === undefined) {
    return "-";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

function resolveImageSource(storageKey: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://") || storageKey.startsWith("/")) {
    return storageKey;
  }

  return null;
}

export default async function UserFavoritesPage() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "USER") {
    redirect("/auth/login");
  }

  const favorites = await db.favorites.findMany({
    where: { user_id: session.user.id },
    orderBy: { created_at: "desc" },
    include: {
      post: {
        include: {
          category: {
            select: { name: true },
          },
          author: {
            select: { id: true, username: true },
          },
          images: {
            orderBy: { sort_order: "asc" },
            take: 1,
            select: { storage_key: true },
          },
        },
      },
    },
  });

  const visibleFavorites = favorites.filter(
    (favorite) => favorite.post && !favorite.post.deleted_at && favorite.post.status === POST_STATUSES.PUBLISHED,
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Ulubione ogloszenia</h1>
        <p className="mt-1 text-sm text-slate-600">Tu znajdziesz wszystkie zapisane oferty.</p>
      </header>

      <section className="space-y-3">
        {visibleFavorites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Brak ulubionych ogloszen. Przegladaj oferty i dodawaj je do ulubionych.
          </div>
        ) : (
          visibleFavorites.map((favorite) => {
            const post = favorite.post;
            if (!post) {
              return null;
            }

            const imageSrc = resolveImageSource(post.images[0]?.storage_key);

            return (
              <article key={favorite.post_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {imageSrc ? (
                        <Image
                          src={imageSrc}
                          alt={post.title}
                          width={96}
                          height={96}
                          sizes="96px"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-200 px-3 text-center text-xs font-medium text-slate-500">
                          Brak zdjecia
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {post.category.name}
                      </div>
                      <h2 className="mt-2 text-lg font-bold text-slate-900">
                        <Link href={`/ogloszenia/${post.id}`} className="hover:text-amber-700">
                          {post.title}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatPrice(post.price_cents, post.currency)} • {post.city || "Brak miasta"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Autor: <Link href={`/u/${post.author.id}`} className="hover:text-amber-700">{post.author.username ?? "Uzytkownik"}</Link>
                      </p>
                    </div>
                  </div>

                  <div className="w-full max-w-xs">
                    <FavoritePostButton postId={post.id} initialIsFavorited />
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
