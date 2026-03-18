"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { ListingImagesUploader, type UploadedListingImage } from "@/components/posts/listing-images-uploader";

type CategoryOption = {
  id: string;
  name: string;
};

type PlacesResult = {
  id: string;
  name: string;
  address?: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
};

type CreatePostFormProps = {
  categories: CategoryOption[];
  isEmailVerified: boolean;
};

export function CreatePostForm({ categories, isEmailVerified }: CreatePostFormProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlacesResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlacesResult | null>(null);
  const [images, setImages] = useState<UploadedListingImage[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasCategories = categories.length > 0;

  const isValid = useMemo(() => {
    const parsedPrice = price.trim() ? Number(price) : undefined;
    const hasValidPrice = parsedPrice === undefined || (Number.isFinite(parsedPrice) && parsedPrice >= 0);
    const normalizedCity = city.trim();

    return title.trim().length >= 5
      && description.trim().length >= 20
      && normalizedCity.length >= 2
      && Boolean(categoryId)
      && hasCategories
      && hasValidPrice;
  }, [categoryId, city, description, hasCategories, price, title]);

  async function searchPlaces() {
    if (!placeQuery.trim()) {
      setPlaceResults([]);
      return;
    }

    setLoadingPlaces(true);

    try {
      const params = new URLSearchParams({ query: placeQuery.trim(), city: city.trim() });
      const response = await fetch(`/api/business/google-lookup?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { results?: PlacesResult[] };
      setPlaceResults(data.results ?? []);
    } catch {
      setPlaceResults([]);
    } finally {
      setLoadingPlaces(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isValid) {
      setError(tr("Uzupelnij wymagane pola formularza.", "Please fill out required form fields."));
      return;
    }

    if (!isEmailVerified) {
      setError(tr("Zweryfikuj adres e-mail przed dodaniem ogloszenia.", "Verify your email address before creating a listing."));
      return;
    }

    setSubmitting(true);

    try {
      const parsedPrice = price.trim() ? Number(price) : undefined;
      const normalizedCity = city.trim();

      if (normalizedCity.length < 2) {
        throw new Error(tr("Podaj miejscowosc ogloszenia.", "Provide listing city."));
      }

      if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        throw new Error(tr("Cena musi byc liczba wieksza lub rowna 0.", "Price must be a number greater than or equal to 0."));
      }

      const priceNumber = parsedPrice !== undefined ? Math.round(parsedPrice * 100) : undefined;
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          priceCents: Number.isFinite(priceNumber) ? priceNumber : undefined,
          city: normalizedCity,
          googlePlaceId: selectedPlace?.id,
          googleMapsUrl: selectedPlace?.googleMapsUrl,
          lat: selectedPlace?.lat,
          lng: selectedPlace?.lng,
          images: images.map((image) => ({
            url: image.url,
            fileKey: image.fileKey,
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie utworzyc ogloszenia.", "Failed to create listing."));
      }

      setSuccess(tr("Ogloszenie zostalo utworzone.", "Listing has been created."));
      setTitle("");
      setDescription("");
      setPrice("");
      setPlaceQuery("");
      setSelectedPlace(null);
      setPlaceResults([]);
      setImages([]);
      router.push(`/ogloszenia/${data.post.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tr("Blad zapisu ogloszenia.", "Listing save error."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h1 className="text-2xl font-bold text-slate-900">{tr("Nowe ogloszenie", "Create listing")}</h1>

      {!isEmailVerified ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {tr(
            "Dodawanie ogloszen wymaga potwierdzonego adresu e-mail. Zweryfikuj konto, a potem sprobuj ponownie.",
            "Creating listings requires a verified email address. Verify your account and try again.",
          )}
        </div>
      ) : null}

      {!hasCategories ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {tr("Brak dostepnych kategorii. Zaimportuj taksonomie przed dodaniem ogloszenia.", "No categories are available yet. Import taxonomy before creating a listing.")}
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">{tr("Tytul", "Title")}</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder={tr("Np. Sprzedam rower gorski", "Example: Mountain bike for sale")}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">{tr("Opis", "Description")}</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-36 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          maxLength={6000}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1 md:col-span-1">
          <label className="text-sm font-semibold text-slate-700">{tr("Kategoria", "Category")}</label>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-sm font-semibold text-slate-700">{tr("Cena (PLN)", "Price (PLN)")}</label>
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="199.99"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-sm font-semibold text-slate-700">{tr("Miasto", "City")}</label>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder={tr("Np. Warszawa", "Example: Warsaw")}
            required
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-800">{tr("Google Places", "Google Places")}</p>
        <div className="flex gap-2">
          <input
            value={placeQuery}
            onChange={(event) => setPlaceQuery(event.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder={tr("Wpisz nazwe miejsca lub firmy", "Search place or business")}
          />
          <button
            type="button"
            onClick={() => void searchPlaces()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800"
          >
            {loadingPlaces ? tr("Szukam...", "Searching...") : tr("Szukaj", "Search")}
          </button>
        </div>

        {placeResults.length > 0 ? (
          <ul className="space-y-2">
            {placeResults.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(result);
                    if (!city.trim()) {
                      setCity(result.name);
                    }
                  }}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-amber-400"
                >
                  <div className="font-semibold text-slate-900">{result.name}</div>
                  <div className="text-xs text-slate-600">{result.address || "-"}</div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selectedPlace ? (
          <p className="text-xs font-medium text-emerald-700">
            {tr("Wybrano miejsce", "Selected place")}: {selectedPlace.name}
          </p>
        ) : null}
      </div>

      <ListingImagesUploader images={images} onChange={setImages} />

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={!isValid || submitting || !isEmailVerified || !hasCategories}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? tr("Zapisywanie...", "Saving...") : tr("Utworz ogloszenie", "Create listing")}
      </button>
    </form>
  );
}
