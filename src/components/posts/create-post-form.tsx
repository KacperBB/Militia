"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { ListingImagesUploader, type UploadedListingImage } from "@/components/posts/listing-images-uploader";

type CategoryOption = {
  id: string;
  name: string;
  parent_id: string | null;
};

type CategoryAttributeOption = {
  id: string;
  label: string;
  value: string;
};

type CategoryAttribute = {
  id: string;
  name: string;
  slug: string;
  type: "text" | "number" | "boolean" | "date" | "select" | "multiselect";
  isRequired: boolean;
  sortOrder: number;
  metadata?: Record<string, string>;
  presentation?: string | null;
  options: CategoryAttributeOption[];
};

type AttributeValue = {
  attributeId: string;
  valueText?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueDate?: string;
  valueJson?: string[];
};

type PlacesResult = {
  id: string;
  name: string;
  address?: string;
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
};

type CurrentUserData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  hasCompany: boolean;
};

type CreatePostFormProps = {
  categories: CategoryOption[];
  isEmailVerified: boolean;
  currentUser: CurrentUserData;
};

type Step = 1 | 2 | 3;

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function CreatePostForm({ categories, isEmailVerified, currentUser }: CreatePostFormProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);

  const categoryInputRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categoryRequiredError, setCategoryRequiredError] = useState(false);
  const [categorySelectionSource, setCategorySelectionSource] = useState<"auto" | "manual" | "none">("none");

  const [images, setImages] = useState<UploadedListingImage[]>([]);
  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [listingProfileType, setListingProfileType] = useState<"PRIVATE" | "COMPANY">(
    currentUser.hasCompany ? "COMPANY" : "PRIVATE",
  );

  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributeValues, setAttributeValues] = useState<Record<string, AttributeValue>>({});

  const [autoRenew, setAutoRenew] = useState(false);
  const [city, setCity] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlacesResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlacesResult | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [contactName, setContactName] = useState(`${currentUser.firstName} ${currentUser.lastName}`.trim());
  const [contactPhone, setContactPhone] = useState(currentUser.phone);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasCategories = categories.length > 0;
  const hasValidCategoryId = UUID_LIKE_RE.test(categoryId);

  const categoryMap = useMemo(() => {
    const map = new Map<string, CategoryOption>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const selectedCategoryObj = categoryMap.get(categoryId);

  const categoryDisplay = useMemo(() => {
    if (!selectedCategoryObj) return "";
    if (!selectedCategoryObj.parent_id) return selectedCategoryObj.name;
    const parent = categoryMap.get(selectedCategoryObj.parent_id);
    return parent ? `${parent.name} / ${selectedCategoryObj.name}` : selectedCategoryObj.name;
  }, [selectedCategoryObj, categoryMap]);

  const titleKeywords = useMemo(
    () => title.toLowerCase().split(/\s+/).map((s) => s.trim()).filter((s) => s.length >= 3),
    [title],
  );

  const categoryScores = useMemo(() => {
    return categories
      .map((cat) => {
        const parent = cat.parent_id ? categoryMap.get(cat.parent_id) : undefined;
        const bag = `${parent?.name ?? ""} ${cat.name}`.toLowerCase();
        const score = titleKeywords.reduce((sum, keyword) => {
          if (!bag.includes(keyword)) return sum;
          return sum + keyword.length;
        }, 0);
        return { cat, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [categories, categoryMap, titleKeywords]);

  const recommendedCategories = useMemo(() => categoryScores.slice(0, 4).map((entry) => entry.cat), [categoryScores]);
  const bestRecommendedCategory = categoryScores[0]?.cat ?? null;

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const query = categorySearchQuery.toLowerCase();
    return categories.filter((cat) => {
      const parent = cat.parent_id ? categoryMap.get(cat.parent_id) : undefined;
      const label = `${parent?.name ?? ""} ${cat.name}`.toLowerCase();
      return label.includes(query);
    });
  }, [categories, categoryMap, categorySearchQuery]);

  useEffect(() => {
    if (!showCategoryDropdown) return;

    function handleClickOutside(event: MouseEvent) {
      if (categoryInputRef.current && !categoryInputRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCategoryDropdown]);

  // Auto-pick category only when user did not explicitly choose one and title is descriptive enough.
  useEffect(() => {
    if (title.trim().length < 12) {
      return;
    }

    if (categorySelectionSource === "manual") {
      return;
    }

    if (!bestRecommendedCategory) {
      return;
    }

    setCategoryId(bestRecommendedCategory.id);
    setCategorySelectionSource("auto");
    setCategoryRequiredError(false);
  }, [bestRecommendedCategory, categorySelectionSource, title]);

  useEffect(() => {
    if (!categoryId || !UUID_LIKE_RE.test(categoryId)) {
      setCategoryAttributes([]);
      setAttributeValues({});
      return;
    }

    let cancelled = false;
    setLoadingAttributes(true);
    setCategoryAttributes([]);
    setAttributeValues({});

    fetch(`/api/categories/${categoryId}/attributes`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load attributes.");
        }
        return (await res.json()) as { attributes?: CategoryAttribute[] };
      })
      .then((data) => {
        if (cancelled) return;
        setCategoryAttributes(data.attributes ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryAttributes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttributes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  function setAttributeValue(update: AttributeValue) {
    setAttributeValues((prev) => ({ ...prev, [update.attributeId]: update }));
  }

  function isAttributeFilled(attr: CategoryAttribute) {
    const value = attributeValues[attr.id];
    if (!value) return false;

    if (attr.type === "text" || attr.type === "select") {
      return Boolean(value.valueText?.trim());
    }

    if (attr.type === "number") {
      return value.valueNumber !== undefined && Number.isFinite(value.valueNumber);
    }

    if (attr.type === "boolean") {
      return value.valueBoolean !== undefined;
    }

    if (attr.type === "date") {
      return Boolean(value.valueDate);
    }

    if (attr.type === "multiselect") {
      return Boolean(value.valueJson?.length);
    }

    return false;
  }

  const requiredAttributesMissing = useMemo(
    () => categoryAttributes.filter((attr) => attr.isRequired && !isAttributeFilled(attr)),
    [attributeValues, categoryAttributes],
  );

  function shouldRenderAsChips(attr: CategoryAttribute) {
    const presentation = attr.presentation?.toLowerCase();
    return presentation === "chips" || presentation === "buttons" || (attr.type === "select" && attr.options.length <= 6);
  }

  const normalizedPrice = price.trim() ? Number(price) : undefined;

  const step1Error = useMemo(() => {
    if (!isEmailVerified) {
      return tr("Zweryfikuj email przed dodaniem ogloszenia.", "Verify your email before creating a listing.");
    }

    if (!hasCategories) {
      return tr("Brak kategorii. Najpierw zaczytaj XML.", "No categories found. Import XML first.");
    }

    if (title.trim().length < 12) {
      return tr("Tytul musi miec minimum 12 znakow, aby dobrze dobrac kategorie.", "Title must have at least 12 characters for category recommendation.");
    }

    if (!categoryId || !hasValidCategoryId) {
      return tr("Prosze wybrac kategorie.", "Please choose a category.");
    }

    if (description.trim().length < 20) {
      return tr("Opis musi miec minimum 20 znakow.", "Description must have at least 20 characters.");
    }

    if (normalizedPrice !== undefined && (!Number.isFinite(normalizedPrice) || normalizedPrice < 0)) {
      return tr("Cena musi byc liczba wieksza lub rowna 0.", "Price must be a number greater than or equal to 0.");
    }

    return null;
  }, [categoryId, description, hasCategories, hasValidCategoryId, isEmailVerified, normalizedPrice, title, tr]);

  const step2Error = useMemo(() => {
    if (loadingAttributes) {
      return tr("Ladowanie parametrow kategorii...", "Loading category parameters...");
    }

    const firstMissing = requiredAttributesMissing[0];
    if (firstMissing) {
      return tr(`Pole \"${firstMissing.name}\" jest wymagane.`, `Field \"${firstMissing.name}\" is required.`);
    }

    return null;
  }, [loadingAttributes, requiredAttributesMissing, tr]);

  const step3Error = useMemo(() => {
    if (city.trim().length < 2) {
      return tr("Podaj lokalizacje ogloszenia (min. 2 znaki).", "Provide listing location (min 2 characters).");
    }

    if (!contactName.trim()) {
      return tr("Podaj imie i nazwisko kontaktowe.", "Provide contact name.");
    }

    if (!contactPhone.trim()) {
      return tr("Podaj numer telefonu kontaktowego.", "Provide contact phone number.");
    }

    return null;
  }, [city, contactName, contactPhone, tr]);

  function goToStep2() {
    setError(null);
    if (!categoryId || !hasValidCategoryId) {
      setCategoryRequiredError(true);
      setError(tr("Prosze wybrac kategorie.", "Please choose a category."));
      return;
    }

    if (step1Error) {
      setError(step1Error);
      return;
    }

    setStep(2);
  }

  function goToStep3() {
    setError(null);
    if (step2Error) {
      setError(step2Error);
      return;
    }

    setStep(3);
  }

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

    if (step1Error) {
      setStep(1);
      setError(step1Error);
      return;
    }

    if (step2Error) {
      setStep(2);
      setError(step2Error);
      return;
    }

    if (step3Error) {
      setStep(3);
      setError(step3Error);
      return;
    }

    setSubmitting(true);

    try {
      const priceCents = normalizedPrice !== undefined ? Math.round(normalizedPrice * 100) : undefined;

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          priceCents: Number.isFinite(priceCents) ? priceCents : undefined,
          city: city.trim(),
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
          isNegotiable,
          useCompanyProfile: listingProfileType === "COMPANY",
          autoRenew,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          attributeValues: Object.values(attributeValues).filter((value) => {
            const attr = categoryAttributes.find((item) => item.id === value.attributeId);
            if (!attr) return false;
            return isAttributeFilled(attr);
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie utworzyc ogloszenia.", "Failed to create listing."));
      }

      setSuccess(tr("Ogloszenie zostalo utworzone.", "Listing has been created."));
      router.push(`/ogloszenia/${data.post.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tr("Blad zapisu ogloszenia.", "Listing save error."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 md:p-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">{tr("Nowe ogloszenie", "Create listing")}</h1>
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((index) => {
            const active = step === index;
            const done = step > index;
            return (
              <div
                key={index}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {index === 1 ? tr("Etap 1: Podstawy", "Step 1: Basics") : null}
                {index === 2 ? tr("Etap 2: Parametry", "Step 2: Parameters") : null}
                {index === 3 ? tr("Etap 3: Kontakt i final", "Step 3: Contact and final") : null}
              </div>
            );
          })}
        </div>
      </header>

      {!isEmailVerified ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {tr(
            "Dodawanie ogloszen wymaga potwierdzonego adresu e-mail. Zweryfikuj konto, a potem sprobuj ponownie.",
            "Creating listings requires a verified email address. Verify your account and try again.",
          )}
        </div>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{tr("Tytul", "Title")}</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder={tr("Np. Telefon Redmi Note 9 Pro 128GB", "Example: Redmi Note 9 Pro 128GB")}
              maxLength={120}
              required
            />
            <p className="text-xs text-slate-500">{tr("Minimum 12 znakow dla auto-doboru kategorii.", "At least 12 characters for auto category recommendation.")}</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">{tr("Kategoria", "Category")}</label>
            <div className="relative" ref={categoryInputRef}>
              <input
                value={categorySearchQuery}
                onChange={(event) => {
                  setCategorySearchQuery(event.target.value);
                  setShowCategoryDropdown(true);
                  setCategoryRequiredError(false);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  categoryRequiredError ? "border-rose-500 bg-rose-50" : "border-slate-300"
                }`}
                placeholder={
                  categoryId
                    ? categoryDisplay
                    : tr("Szukaj lub wpisz kategorie", "Search or type category")
                }
                required
              />
              {showCategoryDropdown && filteredCategories.length > 0 ? (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-300 bg-white shadow-lg">
                  {filteredCategories.map((category) => {
                    const parent = category.parent_id ? categoryMap.get(category.parent_id) : undefined;
                    const displayName = parent ? `${parent.name} / ${category.name}` : category.name;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setCategoryId(category.id);
                          setCategorySelectionSource("manual");
                          setCategorySearchQuery("");
                          setCategoryRequiredError(false);
                          setShowCategoryDropdown(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {categoryRequiredError ? (
              <p className="text-xs font-semibold text-rose-600">{tr("Prosze wybrac kategorie.", "Please choose a category.")}</p>
            ) : null}

            {title.trim().length >= 12 && categorySelectionSource === "auto" && categoryDisplay ? (
              <p className="text-xs font-semibold text-emerald-700">
                {tr("Automatycznie dobrana kategoria:", "Automatically selected category:")} {categoryDisplay}
              </p>
            ) : null}

            {recommendedCategories.length > 0 && categorySearchQuery === "" ? (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-500">{tr("Rekomendowane", "Recommended")}</p>
                <div className="grid gap-1">
                  {recommendedCategories.map((category) => {
                    const parent = category.parent_id ? categoryMap.get(category.parent_id) : undefined;
                    const displayName = parent ? `${parent.name} / ${category.name}` : category.name;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(category.id);
                          setCategorySelectionSource("manual");
                          setCategorySearchQuery("");
                          setCategoryRequiredError(false);
                          setShowCategoryDropdown(false);
                        }}
                        className="block w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-semibold text-amber-900 hover:border-amber-300 hover:bg-amber-100"
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
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
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">{tr("Cena", "Price")}</label>
              <button
                type="button"
                onClick={() => setIsNegotiable((v) => !v)}
                className={`w-full rounded-md border px-3 py-2 text-sm font-semibold ${
                  isNegotiable ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 text-slate-700"
                }`}
              >
                {isNegotiable
                  ? tr("Podlega negocjacji", "Negotiable")
                  : tr("Cena sztywna", "Fixed price")}
              </button>
            </div>
          </div>

          {currentUser.hasCompany ? (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">{tr("Typ ogloszenia", "Listing profile")}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setListingProfileType("PRIVATE")}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    listingProfileType === "PRIVATE"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {tr("Osoba prywatna", "Private person")}
                </button>
                <button
                  type="button"
                  onClick={() => setListingProfileType("COMPANY")}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    listingProfileType === "COMPANY"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 text-slate-700"
                  }`}
                >
                  {tr("Firma", "Company")}
                </button>
              </div>
            </div>
          ) : null}

          <ListingImagesUploader images={images} onChange={setImages} />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">{tr("Parametry produktu", "Product parameters")}</p>
          {loadingAttributes ? (
            <p className="text-xs text-slate-500">{tr("Ladowanie pol...", "Loading fields...")}</p>
          ) : categoryAttributes.length === 0 ? (
            <p className="text-xs text-slate-500">{tr("Brak dodatkowych parametrow dla tej kategorii.", "No additional parameters for this category.")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryAttributes.map((attr) => {
                const val = attributeValues[attr.id];
                const label = (
                  <label className="text-xs font-semibold text-slate-700">
                    {attr.name}
                    {attr.isRequired ? <span className="ml-0.5 text-rose-600">*</span> : null}
                  </label>
                );

                if (attr.type === "boolean") {
                  const state = val?.valueBoolean;
                  return (
                    <div key={attr.id} className="space-y-1">
                      {label}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          aria-pressed={state === true}
                          onClick={() => setAttributeValue({ attributeId: attr.id, valueBoolean: true })}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            state === true ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"
                          }`}
                        >
                          {tr("Tak", "Yes")}
                        </button>
                        <button
                          type="button"
                          aria-pressed={state === false}
                          onClick={() => setAttributeValue({ attributeId: attr.id, valueBoolean: false })}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            state === false ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-700"
                          }`}
                        >
                          {tr("Nie", "No")}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (attr.type === "select" && shouldRenderAsChips(attr)) {
                  return (
                    <div key={attr.id} className="space-y-1">
                      {label}
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={val?.valueText === option.value}
                            onClick={() => setAttributeValue({ attributeId: attr.id, valueText: option.value })}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              val?.valueText === option.value
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 text-slate-700"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (attr.type === "select") {
                  return (
                    <div key={attr.id} className="space-y-1">
                      {label}
                      <select
                        value={val?.valueText ?? ""}
                        onChange={(e) => setAttributeValue({ attributeId: attr.id, valueText: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">{tr("-- wybierz --", "-- select --")}</option>
                        {attr.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (attr.type === "multiselect") {
                  const selected = new Set(val?.valueJson ?? []);
                  return (
                    <div key={attr.id} className="space-y-1 sm:col-span-2">
                      {label}
                      <div className="flex flex-wrap gap-2">
                        {attr.options.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            aria-pressed={selected.has(opt.value)}
                            onClick={() => {
                              const next = new Set(selected);
                              if (next.has(opt.value)) next.delete(opt.value);
                              else next.add(opt.value);
                              setAttributeValue({ attributeId: attr.id, valueJson: [...next] });
                            }}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              selected.has(opt.value)
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-300 text-slate-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (attr.type === "number") {
                  return (
                    <div key={attr.id} className="space-y-1">
                      {label}
                      <input
                        type="number"
                        value={val?.valueNumber ?? ""}
                        onChange={(e) =>
                          setAttributeValue({
                            attributeId: attr.id,
                            valueNumber: e.target.value !== "" ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        step="any"
                      />
                    </div>
                  );
                }

                if (attr.type === "date") {
                  return (
                    <div key={attr.id} className="space-y-1">
                      {label}
                      <input
                        type="date"
                        value={val?.valueDate?.slice(0, 10) ?? ""}
                        onChange={(e) =>
                          setAttributeValue({
                            attributeId: attr.id,
                            valueDate: e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  );
                }

                return (
                  <div key={attr.id} className="space-y-1">
                    {label}
                    <input
                      type="text"
                      value={val?.valueText ?? ""}
                      onChange={(e) => setAttributeValue({ attributeId: attr.id, valueText: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      maxLength={1000}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">{tr("Ustawienia publikacji", "Publication settings")}</p>
            <button
              type="button"
              onClick={() => setAutoRenew((v) => !v)}
              className={`mt-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                autoRenew ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-300 text-slate-700"
              }`}
            >
              {autoRenew
                ? tr("Auto odnawianie wlaczone", "Auto renew enabled")
                : tr("Auto odnawianie wylaczone", "Auto renew disabled")}
            </button>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">{tr("Lokalizacja", "Location")}</p>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder={tr("Np. Warszawa", "Example: Warsaw")}
              required
            />
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
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">{tr("Dane kontaktowe", "Contact details")}</p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Email</label>
              <input
                value={currentUser.email}
                readOnly
                className="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-600"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{tr("Imie i nazwisko", "Name")}</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder={tr("Np. Jan Kowalski", "Example: John Smith")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">{tr("Telefon", "Phone")}</label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="+48..."
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((prev) => (prev - 1) as Step)}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {tr("Wstecz", "Back")}
          </button>
        ) : null}

        {step === 1 ? (
          <button
            type="button"
            onClick={goToStep2}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {tr("Dalej", "Next")}
          </button>
        ) : null}

        {step === 2 ? (
          <button
            type="button"
            onClick={goToStep3}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {tr("Dalej", "Next")}
          </button>
        ) : null}

        {step === 3 ? (
          <button
            type="submit"
            disabled={submitting || Boolean(step1Error || step2Error || step3Error)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? tr("Zapisywanie...", "Saving...") : tr("Utworz ogloszenie", "Create listing")}
          </button>
        ) : null}

        {step === 3 && !submitting && (step1Error || step2Error || step3Error) ? (
          <p className="text-xs text-slate-600">{step1Error || step2Error || step3Error}</p>
        ) : null}
      </div>
    </form>
  );
}
