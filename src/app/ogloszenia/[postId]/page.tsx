import { notFound } from "next/navigation";

import { AdSlot } from "@/components/adsense/ad-slot";
import { ReportFlagWizardTrigger } from "@/components/moderation/report-flag-wizard-trigger";
import { ListingGallery } from "@/components/posts/listing-gallery";
import { ListingLocationMap } from "@/components/posts/listing-location-map";
import { ListingSellerSidebar } from "@/components/posts/listing-seller-sidebar";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

type ListingLocationInput = {
  address: string | null;
  zipCode: string | null;
  city: string | null;
};

function formatPrice(priceCents: number | null, currency: string) {
  if (priceCents === null || priceCents === undefined) {
    return "Cena do uzgodnienia";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(priceCents / 100);
}

function formatDescription(description: string) {
  return description
    .split(/\n{2,}/)
    .map((paragraph: string) => paragraph.trim())
    .filter(Boolean);
}

function formatLocationLabel(input: ListingLocationInput) {
  return [input.address, [input.zipCode, input.city].filter(Boolean).join(" "), input.address ? null : input.city]
    .filter(Boolean)
    .join("\n");
}

function formatCoordinate(value: number) {
  return value.toFixed(4).replace(".", ",");
}

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await getCurrentSession();
  const { postId } = await params;

  const post = await db.posts.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          created_at: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          nip: true,
          email: true,
          phone: true,
          address: true,
          zip_code: true,
          city: true,
          description: true,
          google_maps_url: true,
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
        select: {
          id: true,
          storage_key: true,
        },
      },
    },
  });

  if (!post || post.deleted_at || post.status !== "PUBLISHED") {
    notFound();
  }

  const isOwner = session?.user.id === post.created_by;

  if (!isOwner) {
    await db.posts.update({
      where: { id: post.id },
      data: {
        views_count: { increment: 1 },
      },
    });
  }

  const favorite = session
    ? await db.favorites.findUnique({
        where: {
          user_id_post_id: {
            user_id: session.user.id,
            post_id: post.id,
          },
        },
      })
    : null;

  const displayedViewsCount = post.views_count + (isOwner ? 0 : 1);

  const descriptionParagraphs = formatDescription(post.description);
  const priceLabel = formatPrice(post.price_cents, post.currency);
  const latitude = post.lat ? Number(post.lat) : null;
  const longitude = post.lng ? Number(post.lng) : null;
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const radiusKm = 10;
  const mapPageUrl = hasCoordinates && latitude && longitude
    ? `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=14/${latitude.toFixed(6)}/${longitude.toFixed(6)}`
    : post.company?.google_maps_url ?? null;
  const sellerName = post.company?.name || post.author.username || post.author.email;
  const sellerLocation = post.company
    ? formatLocationLabel({
        city: post.company.city,
        address: post.company.address,
        zipCode: post.company.zip_code,
      })
    : post.city;
  const sellerPhone = post.company?.phone || post.author.phone;
  const sellerEmail = post.company?.email || post.author.email;
  const sellerDescription = post.company?.description?.trim()
    ? post.company.description.trim()
    : post.company
      ? `${post.company.name} prowadzi sprzedaz w serwisie Militia i udostepnia pelne dane kontaktowe dla zainteresowanych.`
      : "Osoba prywatna sprzedajaca bezposrednio przez serwis Militia.";

  const adSlot = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_POST || "";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {post.category.name}
              </div>
              <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {priceLabel}
              </div>
            </div>

            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">{post.title}</h1>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>Dodano: {new Date(post.created_at).toLocaleString("pl-PL")}</span>
              <span>Lokalizacja: {post.city || post.company?.city || "Brak danych"}</span>
              <span>Sprzedawca: {sellerName}</span>
              <span>Wyswietlenia: {displayedViewsCount}</span>
            </div>

            <div className="mt-3 flex justify-end">
              <ReportFlagWizardTrigger
                targetType="POST"
                targetId={post.id}
                submitUrl={`/api/posts/${post.id}/flags`}
                categoriesTargetType="POST"
                triggerLabel="Zglos ogloszenie"
                modalTitle="Zgloszenie ogloszenia"
              />
            </div>

            <div className="mt-6">
              <ListingGallery images={post.images} title={post.title} />
            </div>

            <section className="mt-6 rounded-2xl bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Opis ogloszenia</h2>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
                {descriptionParagraphs.map((paragraph: string) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900">Szczegoly</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Cena</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{priceLabel}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Miasto</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{post.city || post.company?.city || "Brak danych"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Wyswietlenia</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{displayedViewsCount}</p>
                </div>
              </div>
            </section>

            {hasCoordinates && latitude !== null && longitude !== null ? (
              <section className="mt-4 rounded-2xl border border-slate-200 p-5">
                <h2 className="text-lg font-bold text-slate-900">Lokalizacja na mapie</h2>
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  <ListingLocationMap
                    lat={latitude}
                    lng={longitude}
                    city={post.city || post.company?.city || null}
                    address={
                      post.company
                        ? [post.company.address, [post.company.zip_code, post.company.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null
                        : post.city || null
                    }
                    radiusKm={radiusKm}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Okrag pokazuje przyblizony obszar do {radiusKm} km. Dokladny adres nie jest publikowany.
                </p>
                {mapPageUrl ? (
                  <a
                    href={mapPageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  >
                    Otworz pelna mape
                  </a>
                ) : null}
              </section>
            ) : null}
          </article>

          {adSlot ? <AdSlot slot={adSlot} className="min-h-22.5" /> : null}
        </div>

        <ListingSellerSidebar
          seller={{
            type: post.company ? "COMPANY" : "PRIVATE",
            userId: post.author.id,
            name: sellerName,
            email: sellerEmail,
            phone: sellerPhone,
            joinedAtLabel: `Konto od ${new Date(post.author.created_at).toLocaleDateString("pl-PL")}`,
            companyName: post.company?.name ?? null,
            companyDescription: sellerDescription,
            nip: post.company?.nip ?? null,
            address: post.company
              ? formatLocationLabel({
                  city: post.company.city,
                  address: post.company.address,
                  zipCode: post.company.zip_code,
                })
              : null,
            locationLabel: sellerLocation || null,
            mapsUrl: post.company?.google_maps_url ?? null,
            postId: post.id,
          }}
          viewer={{
            isFavorited: Boolean(favorite),
            canFavorite: Boolean(session) && !isOwner,
          }}
        />
      </div>
    </main>
  );
}
