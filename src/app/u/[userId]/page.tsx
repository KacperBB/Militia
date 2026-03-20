import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";

import { ReportFlagWizardTrigger } from "@/components/moderation/report-flag-wizard-trigger";
import { SellerRouteMap } from "@/components/seller/seller-route-map";
import { db } from "@/lib/db";
import { POST_STATUSES, applyPostLifecycle } from "@/lib/posts/status";

export default async function UserPublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ view?: string; q?: string; category?: string; tab?: string }>;
}) {
  const { userId } = await params;
  const { view, q, category, tab } = await searchParams;
  const query = q?.trim() ?? "";
  const selectedCategoryId = category?.trim() || null;

  await applyPostLifecycle();

  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar_url: true,
      created_at: true,
      company: {
        select: {
          id: true,
          name: true,
          city: true,
          address: true,
          description: true,
          avatar_url: true,
          banner_url: true,
          created_at: true,
          route_stops: {
            orderBy: { sort_order: "asc" },
            select: {
              id: true,
              label: true,
              address: true,
              city: true,
              zip_code: true,
              notes: true,
              available_from: true,
              available_to: true,
              lat: true,
              lng: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const isShopView = view === "shop" && Boolean(user.company);
  const companyRouteStops = user.company?.route_stops.map((stop) => ({
    id: stop.id,
    label: stop.label,
    address: stop.address ?? "",
    city: stop.city ?? "",
    zipCode: stop.zip_code ?? "",
    notes: stop.notes ?? "",
    availableFrom: stop.available_from ? new Date(stop.available_from).toISOString() : "",
    availableTo: stop.available_to ? new Date(stop.available_to).toISOString() : "",
    lat: Number(stop.lat),
    lng: Number(stop.lng),
  })) ?? [];

  const scopeWhere: Prisma.postsWhereInput = {
    created_by: user.id,
    status: POST_STATUSES.PUBLISHED,
    deleted_at: null,
    company_id: isShopView ? user.company?.id : null,
  };

  const postsWhere: Prisma.postsWhereInput = {
    ...scopeWhere,
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
    orderBy: [{ created_at: "desc" }],
    select: {
      id: true,
      title: true,
      category_id: true,
      city: true,
      created_at: true,
      price_cents: true,
      currency: true,
      category: {
        select: {
          name: true,
        },
      },
      images: {
        orderBy: { sort_order: "asc" },
        take: 1,
        select: {
          storage_key: true,
        },
      },
    },
    take: 30,
  });

  const groupedByCategory = await db.posts.groupBy({
    by: ["category_id"],
    where: scopeWhere,
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

  const categoryMap = new Map(categories.map((categoryItem) => [categoryItem.id, categoryItem]));
  const categoryItems = groupedByCategory
    .map((item) => {
      const categoryItem = categoryMap.get(item.category_id);
      if (!categoryItem) {
        return null;
      }
      return {
        id: categoryItem.id,
        name: categoryItem.name,
        count: item._count._all,
      };
    })
    .filter((item): item is { id: string; name: string; count: number } => Boolean(item));

  const buildShopTabHref = (tabValue: string | null) => {
    const p = new URLSearchParams();
    p.set("view", "shop");
    if (tabValue) p.set("tab", tabValue);
    return `/u/${user.id}?${p.toString()}`;
  };

  const buildProfileFilterHref = (categoryId: string | null) => {
    const params = new URLSearchParams();
    if (isShopView) {
      params.set("view", "shop");
    }
    if (query) {
      params.set("q", query);
    }
    if (categoryId) {
      params.set("category", categoryId);
    }
    const encoded = params.toString();
    return encoded ? `/u/${user.id}?${encoded}` : `/u/${user.id}`;
  };

  const formatPrice = (priceCents: number | null, currency: string) => {
    if (priceCents === null) {
      return "Cena do ustalenia";
    }

    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(priceCents / 100);
  };

  if (isShopView && user.company) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_30%),linear-gradient(180deg,#fffdf7_0%,#f8fafc_100%)]">
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-4 md:px-6">
          <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            {user.company.banner_url ? (
              <div className="h-44 w-full overflow-hidden bg-slate-100 md:h-64">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={user.company.name} className="h-full w-full object-cover" src={user.company.banner_url} />
              </div>
            ) : (
              <div className="h-44 w-full bg-[linear-gradient(135deg,#f59e0b_0%,#fbbf24_35%,#0f172a_100%)] md:h-64" />
            )}

            <div className="grid gap-8 p-6 md:grid-cols-[180px_minmax(0,1fr)_auto] md:p-8">
              <div className="flex items-center justify-center md:justify-start">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-slate-100 text-3xl font-bold text-slate-700 shadow-lg">
                  {user.company.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt={user.company.name} className="h-full w-full object-cover" src={user.company.avatar_url} />
                  ) : (
                    (user.company.name || user.username || user.email).slice(0, 1).toUpperCase()
                  )}
                </div>
              </div>

              <div>
                <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
                  Sklep sprzedawcy
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{user.company.name}</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Konto od {new Date(user.company.created_at).toLocaleDateString("pl-PL")}
                  {user.company.city ? ` • ${user.company.city}` : ""}
                </p>
                <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700">
                  {user.company.description?.trim() || `${user.company.name} prowadzi aktywną sprzedaż w serwisie Militia.`}
                </p>
                {user.company.address ? (
                  <p className="mt-3 text-sm text-slate-500">Lokalizacja: {user.company.address}</p>
                ) : null}
              </div>

              <div className="flex flex-col items-start gap-3 md:items-end">
                <Link
                  href={`/u/${user.id}`}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Zobacz profil prywatny
                </Link>
                <ReportFlagWizardTrigger
                  targetType="USER"
                  targetId={user.id}
                  categoriesTargetType="USER"
                  triggerLabel="Zglos sprzedawce"
                  modalTitle="Zgloszenie sprzedawcy"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-10 md:px-6">
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aktywne oferty sklepu</p>
              <p className="mt-3 text-3xl font-bold text-slate-950">{posts.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Typ profilu</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Sprzedawca firmowy</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Widok publiczny</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">Tutaj trafiają użytkownicy po wejściu w ogłoszenia dodane jako sklep.</p>
            </div>
          </div>

          <div className="mb-5 flex gap-2">
            <Link
              href={buildShopTabHref(null)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab !== "trasa"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Oferty
            </Link>
            {companyRouteStops.length > 0 ? (
              <Link
                href={buildShopTabHref("trasa")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  tab === "trasa"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Trasa
              </Link>
            ) : null}
          </div>

          {tab !== "trasa" ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">Oferty sklepu</h2>
                <p className="mt-1 text-sm text-slate-500">Pozostałe ogłoszenia opublikowane z profilu firmowego.</p>
              </div>
            </div>

            <form action={`/u/${user.id}`} method="get" className="mt-4 flex gap-2">
              <input type="hidden" name="view" value="shop" />
              {selectedCategoryId ? <input type="hidden" name="category" value={selectedCategoryId} /> : null}
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Szukaj po nazwie ogłoszenia"
                className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
              />
              <button type="submit" className="rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Szukaj
              </button>
            </form>

            <div className="mt-6 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3 h-fit">
                <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kategorie</p>
                <div className="mt-2 space-y-1">
                  <Link
                    href={buildProfileFilterHref(null)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      !selectedCategoryId ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
                    }`}
                  >
                    <span>Wszystkie</span>
                    <span className={`text-xs ${!selectedCategoryId ? "text-slate-200" : "text-slate-500"}`}>
                      {groupedByCategory.reduce((acc, item) => acc + item._count._all, 0)}
                    </span>
                  </Link>
                  {categoryItems.map((categoryItem) => (
                    <Link
                      key={categoryItem.id}
                      href={buildProfileFilterHref(categoryItem.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                        selectedCategoryId === categoryItem.id
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-white"
                      }`}
                    >
                      <span className="truncate pr-2">{categoryItem.name}</span>
                      <span className={`text-xs ${selectedCategoryId === categoryItem.id ? "text-slate-200" : "text-slate-500"}`}>
                        {categoryItem.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </aside>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  Brak opublikowanych ofert sklepu.
                </div>
              ) : (
                posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/ogloszenia/${post.id}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white"
                  >
                    <div className="h-40 bg-slate-100">
                      {post.images[0]?.storage_key ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={post.title} className="h-full w-full object-cover" src={post.images[0].storage_key} />
                      ) : null}
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Sklep</div>
                      <h3 className="line-clamp-2 text-base font-bold text-slate-900">{post.title}</h3>
                      <p className="text-sm font-semibold text-emerald-700">{formatPrice(post.price_cents, post.currency)}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{post.city || "Brak lokalizacji"}</span>
                        <span>{new Date(post.created_at).toLocaleDateString("pl-PL")}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
              </div>
            </div>
          </section>
          ) : null}

          {tab === "trasa" && companyRouteStops.length > 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-950">Trasa sprzedawcy</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Kolejnosc punktow pokazuje, gdzie sprzedawca regularnie prowadzi sprzedaz lub odbiory.
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  {companyRouteStops.length} {companyRouteStops.length === 1 ? "punkt" : companyRouteStops.length < 5 ? "punkty" : "punktow"}
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_320px]">
                <SellerRouteMap stops={companyRouteStops} heightClassName="h-[420px]" />

                <div className="space-y-3">
                  {companyRouteStops.map((stop, index) => (
                    <div key={stop.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{stop.label}</p>
                          <p className="text-xs text-slate-500">{[stop.address, stop.zipCode, stop.city].filter(Boolean).join(", ")}</p>
                          {stop.availableFrom || stop.availableTo ? (
                            <p className="text-xs text-slate-500">
                              {stop.availableFrom
                                ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(stop.availableFrom))
                                : "od teraz"}
                              {" → "}
                              {stop.availableTo
                                ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(stop.availableTo))
                                : "bez konca"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {stop.notes ? <p className="mt-3 text-sm leading-6 text-slate-600">{stop.notes}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.username || user.email}</h1>
            <p className="mt-1 text-sm text-slate-600">Profil uzytkownika</p>
            <p className="mt-2 text-xs text-slate-500">Data dolaczenia: {new Date(user.created_at).toLocaleDateString("pl-PL")}</p>
            {user.company ? (
              <div className="mt-4">
                <Link
                  href={`/u/${user.id}?view=shop`}
                  className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Zobacz podglad sklepu
                </Link>
              </div>
            ) : null}
          </div>
          <ReportFlagWizardTrigger
            targetType="USER"
            targetId={user.id}
            categoriesTargetType="USER"
            triggerLabel="Zglos uzytkownika"
            modalTitle="Zgloszenie uzytkownika"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Ogloszenia prywatne</h2>
        <form action={`/u/${user.id}`} method="get" className="mt-3 flex gap-2">
          {selectedCategoryId ? <input type="hidden" name="category" value={selectedCategoryId} /> : null}
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Szukaj po nazwie ogłoszenia"
            className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
          />
          <button type="submit" className="rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Szukaj
          </button>
        </form>

        <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3 h-fit">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kategorie</p>
            <div className="mt-2 space-y-1">
              <Link
                href={buildProfileFilterHref(null)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  !selectedCategoryId ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
                }`}
              >
                <span>Wszystkie</span>
                <span className={`text-xs ${!selectedCategoryId ? "text-slate-200" : "text-slate-500"}`}>
                  {groupedByCategory.reduce((acc, item) => acc + item._count._all, 0)}
                </span>
              </Link>
              {categoryItems.map((categoryItem) => (
                <Link
                  key={categoryItem.id}
                  href={buildProfileFilterHref(categoryItem.id)}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    selectedCategoryId === categoryItem.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-white"
                  }`}
                >
                  <span className="truncate pr-2">{categoryItem.name}</span>
                  <span className={`text-xs ${selectedCategoryId === categoryItem.id ? "text-slate-200" : "text-slate-500"}`}>
                    {categoryItem.count}
                  </span>
                </Link>
              ))}
            </div>
          </aside>

          <div className="space-y-2">
          {posts.length === 0 ? (
            <p className="text-sm text-slate-500">Brak opublikowanych ogloszen.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div>
                  <Link href={`/ogloszenia/${post.id}`} className="text-sm font-semibold text-slate-900 hover:text-amber-700">
                    {post.title}
                  </Link>
                  <p className="text-xs text-slate-500">{post.category.name} • {post.city || "-"}</p>
                </div>
                <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString("pl-PL")}</p>
              </div>
            ))
          )}
          </div>
        </div>
      </section>
    </main>
  );
}
