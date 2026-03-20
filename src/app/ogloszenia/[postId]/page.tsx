import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/adsense/ad-slot";
import { ReportFlagWizardTrigger } from "@/components/moderation/report-flag-wizard-trigger";
import { ListingGallery } from "@/components/posts/listing-gallery";
import { ListingLocationMap } from "@/components/posts/listing-location-map";
import { ListingSellerSidebar } from "@/components/posts/listing-seller-sidebar";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { POST_STATUSES, applyPostLifecycle } from "@/lib/posts/status";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ListingLocationInput = {
  address: string | null;
  zipCode: string | null;
  city: string | null;
};

type ListingAttributeValue = {
  id: string;
  attribute: {
    id: string;
    name: string;
    slug: string;
    attribute_type: string;
    sort_order: number;
    options: Array<{
      label: string;
      value: string;
    }>;
  };
  value_text: string | null;
  value_number: unknown;
  value_boolean: boolean | null;
  value_date: Date | null;
  value_json: unknown;
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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function formatAttributeValue(attributeValue: ListingAttributeValue) {
  const attributeType = attributeValue.attribute.attribute_type;
  const optionsByValue = new Map(attributeValue.attribute.options.map((option) => [option.value, option.label]));

  if (attributeType === "boolean") {
    if (attributeValue.value_boolean === null) {
      return null;
    }

    return attributeValue.value_boolean ? "Tak" : "Nie";
  }

  if (attributeType === "date") {
    return attributeValue.value_date ? new Date(attributeValue.value_date).toLocaleDateString("pl-PL") : null;
  }

  if (attributeType === "multiselect") {
    const values = normalizeStringArray(attributeValue.value_json);
    if (!values.length) {
      return null;
    }

    return values.map((value) => optionsByValue.get(value) ?? value).join(", ");
  }

  if (attributeType === "number") {
    if (attributeValue.value_number === null || attributeValue.value_number === undefined) {
      return null;
    }

    const numericValue = Number(attributeValue.value_number);
    if (!Number.isFinite(numericValue)) {
      return String(attributeValue.value_number);
    }

    return new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: Number.isInteger(numericValue) ? 0 : 2,
      maximumFractionDigits: 4,
    }).format(numericValue);
  }

  if (attributeType === "select") {
    if (!attributeValue.value_text) {
      return null;
    }

    return optionsByValue.get(attributeValue.value_text) ?? attributeValue.value_text;
  }

  if (attributeValue.value_text) {
    return attributeValue.value_text;
  }

  return null;
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function statusBanner(status: string) {
  switch (status) {
    case POST_STATUSES.DRAFT:
      return {
        title: "To ogłoszenie jest zapisane jako draft.",
        text: "Jest widoczne tylko dla właściciela, administratora i moderatora do czasu rozpoczęcia review lub publikacji.",
        className: "border-slate-300 bg-slate-50 text-slate-800",
      };
    case POST_STATUSES.IN_REVIEW:
      return {
        title: "To ogłoszenie jest obecnie w review.",
        text: "Jest widoczne tylko dla właściciela, administratora i moderatora do czasu zakończenia review.",
        className: "border-blue-300 bg-blue-50 text-blue-900",
      };
    case POST_STATUSES.REVIEWED:
      return {
        title: "To ogłoszenie zostało zreviewowane i czeka na publikację.",
        text: "Jest widoczne tylko dla właściciela, administratora i moderatora.",
        className: "border-amber-300 bg-amber-50 text-amber-900",
      };
    case POST_STATUSES.EXPIRED:
      return {
        title: "To ogłoszenie wygasło.",
        text: "Nie jest publicznie widoczne. Możesz je edytować lub ponownie opublikować po review.",
        className: "border-rose-300 bg-rose-50 text-rose-900",
      };
    case POST_STATUSES.CANCELLED:
      return {
        title: "To ogłoszenie zostało anulowane.",
        text: "Nie jest publicznie widoczne. Nadal mogą je podejrzeć właściciel, administrator i moderator.",
        className: "border-slate-300 bg-slate-100 text-slate-800",
      };
    default:
      return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  if (!UUID_RE.test(postId)) return {};

  await applyPostLifecycle();

  const post = await db.posts.findUnique({
    where: { id: postId, deleted_at: null, status: POST_STATUSES.PUBLISHED },
    select: {
      title: true,
      description: true,
      city: true,
      price_cents: true,
      currency: true,
      images: { orderBy: { sort_order: "asc" }, take: 1, select: { storage_key: true } },
      category: { select: { name: true } },
    },
  });

  if (!post) return {};

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").split(",")[0].replace(/\/$/, "");
  const url = `${appUrl}/ogloszenia/${postId}`;
  const title = `${post.title} – ${post.category.name} | Militia`;
  const description = post.description.slice(0, 155).replace(/\n+/g, " ").trim() + (post.description.length > 155 ? "…" : "");
  const image = post.images[0]?.storage_key ?? null;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: post.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ListingDetailsPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await getCurrentSession();
  const { postId } = await params;

  await applyPostLifecycle();

  if (!UUID_RE.test(postId)) notFound();

  const post = await db.posts.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          email: true,
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
          banner_url: true,
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
      attribute_values: {
        include: {
          attribute: {
            select: {
              id: true,
              name: true,
              slug: true,
              attribute_type: true,
              sort_order: true,
              options: {
                orderBy: { sort_order: "asc" },
                select: {
                  label: true,
                  value: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post || post.deleted_at) {
    notFound();
  }

  const isOwner = session?.user.id === post.created_by;
  const isStaff = ["ADMIN", "MODERATOR"].includes(session?.user.role ?? "");
  const canPreviewUnpublished = isOwner || isStaff;

  if (post.status !== POST_STATUSES.PUBLISHED && !canPreviewUnpublished) {
    notFound();
  }

  if (post.status === POST_STATUSES.PUBLISHED && !isOwner && !isStaff) {
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

  const descriptionParagraphs = formatDescription(post.description);
  const priceLabel = formatPrice(post.price_cents, post.currency);
  const displayedViewsCount = post.views_count + (isOwner ? 0 : 1);
  const detailItems = [
    {
      label: "Cena",
      value: priceLabel,
    },
    {
      label: "Miasto",
      value: post.city || post.company?.city || "Brak danych",
    },
    {
      label: "Wyświetlenia",
      value: String(displayedViewsCount),
    },
    ...post.attribute_values
      .map((attributeValue) => ({
        label: attributeValue.attribute.name,
        value: formatAttributeValue(attributeValue as ListingAttributeValue),
        sortOrder: attributeValue.attribute.sort_order,
      }))
      .filter((item): item is { label: string; value: string; sortOrder: number } => Boolean(item.value))
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }

        return left.label.localeCompare(right.label, "pl");
      })
      .map((item) => ({
        label: item.label,
        value: item.value,
      })),
  ];
  const latitude = post.lat ? Number(post.lat) : null;
  const longitude = post.lng ? Number(post.lng) : null;
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const radiusKm = 10;
  const mapPageUrl = hasCoordinates && latitude && longitude
    ? `https://www.openstreetmap.org/?mlat=${latitude.toFixed(6)}&mlon=${longitude.toFixed(6)}#map=14/${latitude.toFixed(6)}/${longitude.toFixed(6)}`
    : post.company?.google_maps_url ?? null;
  const sellerName = post.company?.name || post.author.username || "Sprzedawca";
  const sellerLocation = post.company
    ? formatLocationLabel({
        city: post.company.city,
        address: post.company.address,
        zipCode: post.company.zip_code,
      })
    : post.city;
  // Contact details gated: only pass to client when viewer is authenticated (prevents PII scraping)
  const sellerPhone = session ? (post.contact_phone || post.company?.phone || null) : null;
  const sellerEmail = session ? (post.company?.email || null) : null;
  const sellerDescription = post.company?.description?.trim()
    ? post.company.description.trim()
    : post.company
      ? `${post.company.name} prowadzi sprzedaż w serwisie Militia i udostępnia pełne dane kontaktowe dla zainteresowanych.`
      : "Osoba prywatna sprzedająca bezpośrednio przez serwis Militia.";

  const adSlotTop = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_POST_TOP || process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_POST || "";
  const adSlotSidebar = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_POST_SIDEBAR || "";
  const adSlotBottom = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_POST_BOTTOM || "";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").split(",")[0].replace(/\/$/, "");
  const previewBanner = statusBanner(post.status);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: post.title,
    description: post.description.slice(0, 500).replace(/\n+/g, " "),
    url: `${appUrl}/ogloszenia/${postId}`,
    ...(post.price_cents !== null
      ? { price: (post.price_cents / 100).toFixed(2), priceCurrency: post.currency }
      : {}),
    availability: "https://schema.org/InStock",
    ...(post.images[0]?.storage_key ? { image: post.images[0].storage_key } : {}),
    seller: {
      "@type": post.company ? "Organization" : "Person",
      name: sellerName,
    },
    itemOffered: {
      "@type": "Product",
      name: post.title,
      description: post.description.slice(0, 500).replace(/\n+/g, " "),
      category: post.category.name,
    },
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            {previewBanner ? (
              <div className={`mb-4 rounded-2xl border px-4 py-3 ${previewBanner.className}`}>
                <p className="text-sm font-semibold">{previewBanner.title}</p>
                <p className="mt-1 text-sm">{previewBanner.text}</p>
              </div>
            ) : null}

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
              <span>Wyświetlenia: {displayedViewsCount}</span>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {(isOwner || isStaff) ? (
                <Link
                  href={`/ogloszenia/${post.id}/edytuj`}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Edytuj ogłoszenie
                </Link>
              ) : null}
              {post.status === POST_STATUSES.PUBLISHED ? (
                <ReportFlagWizardTrigger
                  targetType="POST"
                  targetId={post.id}
                  submitUrl={`/api/posts/${post.id}/flags`}
                  categoriesTargetType="POST"
                  triggerLabel="Zglos ogloszenie"
                  modalTitle="Zgloszenie ogloszenia"
                />
              ) : null}
            </div>

            <div className="mt-6">
              <ListingGallery images={post.images} title={post.title} />
            </div>

            {adSlotTop ? <AdSlot slot={adSlotTop} className="mt-6 min-h-[100px]" format="horizontal" responsive /> : null}

            <section className="mt-6 rounded-2xl bg-slate-50 p-5">
              <h2 className="text-lg font-bold text-slate-900">Opis ogłoszenia</h2>
              <div className="mt-3 space-y-4 text-sm leading-7 text-slate-700">
                {descriptionParagraphs.map((paragraph: string) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="mt-4 rounded-2xl border border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900">Szczegóły</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {detailItems.map((detail) => (
                  <div key={detail.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{detail.label}</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{detail.value}</p>
                  </div>
                ))}
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
                  Okrąg pokazuje przybliżony obszar do {radiusKm} km. Dokładny adres nie jest publikowany.
                </p>
                {mapPageUrl ? (
                  <a
                    href={mapPageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
                  >
                    Otwórz pełną mapę
                  </a>
                ) : null}
              </section>
            ) : null}
          </article>

          {adSlotBottom ? <AdSlot slot={adSlotBottom} className="min-h-[100px]" format="horizontal" responsive /> : null}
        </div>

        <div className="space-y-4">
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
              companyBannerUrl: post.company?.banner_url ?? null,
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
              isAuthenticated: Boolean(session),
            }}
          />

          {adSlotSidebar ? <AdSlot slot={adSlotSidebar} className="min-h-[280px]" format="auto" responsive /> : null}
        </div>
      </div>
    </main>
  );
}
