import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

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

export default async function UserListingsPage() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "USER") {
    redirect("/auth/login");
  }

  const posts = await db.posts.findMany({
    where: {
      created_by: session.user.id,
      deleted_at: null,
    },
    orderBy: [{ created_at: "desc" }],
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-slate-900">Moje ogloszenia</h1>
        <p className="mt-1 text-sm text-slate-600">Tutaj widzisz prywatne statystyki swoich ogloszen, w tym wyswietlenia i polubienia.</p>
      </header>

      <section className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Nie masz jeszcze zadnych ogloszen.
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{post.category.name}</div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    <Link href={`/ogloszenia/${post.id}`} className="hover:text-amber-700">{post.title}</Link>
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{formatPrice(post.price_cents, post.currency)} • {post.city || "Brak miasta"}</p>
                </div>
                <div className="grid min-w-55 grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Wyswietlenia</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">{post.views_count}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Polubienia</div>
                    <div className="mt-1 text-xl font-bold text-slate-900">{post.favorites_count}</div>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Dodano: {new Date(post.created_at).toLocaleString("pl-PL")}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
