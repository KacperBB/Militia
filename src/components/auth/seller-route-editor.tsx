"use client";

import { useEffect, useMemo, useState } from "react";

import { type CompanyRouteStopInput } from "@/lib/company-route";
import { RouteStopPickerMap } from "@/components/seller/route-stop-picker-map";
import { SellerRouteMap } from "@/components/seller/seller-route-map";

type SellerRouteEditorProps = {
  locale: "pl" | "en";
  value: CompanyRouteStopInput[];
  onChange: (nextValue: CompanyRouteStopInput[]) => void;
};

type SearchResult = {
  label: string;
  address: string;
  city: string;
  zipCode: string;
  lat: number;
  lng: number;
};

function createRouteStopId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `route-stop-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toLocalDateTimeInput(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => part.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatAvailability(value?: string, locale: "pl" | "en" = "pl") {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createEmptyStop(): CompanyRouteStopInput {
  return {
    id: createRouteStopId(),
    label: "",
    address: "",
    city: "",
    zipCode: "",
    notes: "",
    availableFrom: "",
    availableTo: "",
    lat: 52.069,
    lng: 19.48,
  };
}

function plAddress(parts: SearchResult) {
  return [parts.address, parts.zipCode, parts.city].filter(Boolean).join(", ");
}

function getStopKey(stop: CompanyRouteStopInput, index: number) {
  return stop.id?.trim() || `stop-${index}`;
}

export function SellerRouteEditor({ locale, value, onChange }: SellerRouteEditorProps) {
  const tr = (pl: string, en: string) => (locale === "en" ? en : pl);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerResults, setPickerResults] = useState<SearchResult[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [addressResolveIndex, setAddressResolveIndex] = useState<number | null>(null);
  const [addressResolveErrorIndex, setAddressResolveErrorIndex] = useState<number | null>(null);
  const [addressResolveError, setAddressResolveError] = useState<string | null>(null);
  const [expandedStopIds, setExpandedStopIds] = useState<string[]>([]);
  const pickerStop = pickerIndex !== null ? value[pickerIndex] ?? null : null;
  const activePicker = pickerIndex !== null && pickerStop
    ? {
        index: pickerIndex,
        stop: pickerStop,
      }
    : null;

  const mapPins = useMemo(
    () => pickerResults.map((result) => ({ lat: result.lat, lng: result.lng, label: result.label })),
    [pickerResults],
  );

  useEffect(() => {
    const existingIds = new Set(value.map((stop, index) => getStopKey(stop, index)));
    setExpandedStopIds((prev) => prev.filter((id) => existingIds.has(id)));
  }, [value]);

  const isStopExpanded = (stop: CompanyRouteStopInput, index: number) => expandedStopIds.includes(getStopKey(stop, index));

  const openStopEditor = (stop: CompanyRouteStopInput, index: number) => {
    const key = getStopKey(stop, index);
    setExpandedStopIds((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const confirmStop = (stop: CompanyRouteStopInput, index: number) => {
    const key = getStopKey(stop, index);
    setExpandedStopIds((prev) => prev.filter((id) => id !== key));
  };

  const updateStop = (index: number, patch: Partial<CompanyRouteStopInput>) => {
    onChange(value.map((stop, stopIndex) => (stopIndex === index ? { ...stop, ...patch } : stop)));
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) {
      return;
    }

    const nextStops = [...value];
    const [item] = nextStops.splice(index, 1);
    nextStops.splice(nextIndex, 0, item);
    onChange(nextStops);
  };

  const removeStop = (index: number) => {
    onChange(value.filter((_, stopIndex) => stopIndex !== index));
  };

  const addStop = () => {
    const nextStop = createEmptyStop();
    onChange([...value, nextStop]);
    const nextKey = nextStop.id?.trim() || `stop-${value.length}`;
    setExpandedStopIds((prev) => (prev.includes(nextKey) ? prev : [...prev, nextKey]));
  };

  const applySearchResult = (result: SearchResult) => {
    if (pickerIndex === null) {
      return;
    }

    const currentLabel = value[pickerIndex]?.label?.trim();
    updateStop(pickerIndex, {
      label: currentLabel || result.label,
      address: result.address,
      city: result.city,
      zipCode: result.zipCode,
      lat: result.lat,
      lng: result.lng,
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), lang: locale });
    const response = await fetch(`/api/geocode/reverse?${params}`);

    if (!response.ok) {
      throw new Error(tr("Nie udalo sie pobrac adresu z mapy.", "Unable to resolve address from the map."));
    }

    const payload = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    const address = payload.address ?? {};
    const streetParts = [address.road, address.house_number].filter(Boolean).join(" ").trim();
    const city = address.city || address.town || address.village || address.municipality || "";
    const zipCode = address.postcode || "";

    return {
      address: streetParts || payload.display_name || "",
      city,
      zipCode,
    };
  };

  const handleMapPick = async (lat: number, lng: number) => {
    if (pickerIndex === null) {
      return;
    }

    updateStop(pickerIndex, { lat, lng });
    setPickerError(null);

    try {
      const reverse = await reverseGeocode(lat, lng);
      updateStop(pickerIndex, {
        address: reverse.address,
        city: reverse.city,
        zipCode: reverse.zipCode,
      });
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : tr("Nie udalo sie odczytac adresu.", "Unable to resolve address."));
    }
  };

  const handleSearch = async () => {
    const query = pickerSearch.trim();
    if (!query) {
      setPickerError(tr("Wpisz miejscowosc lub adres do wyszukania.", "Enter a city or address to search."));
      return;
    }

    setPickerLoading(true);
    setPickerError(null);

    try {
      const params = new URLSearchParams({ q: query, lang: locale });
      const response = await fetch(`/api/geocode/search?${params}`);

      if (!response.ok) {
        throw new Error(tr("Wyszukiwanie punktow trasy nie powiodlo sie.", "Route stop search failed."));
      }

      const payload = (await response.json()) as Array<{
        lat?: string;
        lon?: string;
        display_name?: string;
        name?: string;
        address?: Record<string, string | undefined>;
      }>;

      const results = payload
        .map((item) => {
          const lat = Number(item.lat);
          const lng = Number(item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return null;
          }

          const address = item.address ?? {};
          const streetParts = [address.road, address.house_number].filter(Boolean).join(" ").trim();
          const city = address.city || address.town || address.village || address.municipality || "";
          const zipCode = address.postcode || "";

          return {
            label: item.name || city || item.display_name || tr("Punkt trasy", "Route stop"),
            address: streetParts || item.display_name || "",
            city,
            zipCode,
            lat,
            lng,
          };
        })
        .filter((item): item is SearchResult => Boolean(item));

      setPickerResults(results);

      if (results.length === 0) {
        setPickerError(tr("Nie znaleziono punktow dla tego zapytania.", "No route stops found for this query."));
      }
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : tr("Wyszukiwanie punktow trasy nie powiodlo sie.", "Route stop search failed."));
      setPickerResults([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const resolveStopCoordinates = async (index: number) => {
    const stop = value[index];
    if (!stop) {
      return;
    }

    const query = [stop.address, stop.zipCode, stop.city, stop.label]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ");

    if (!query) {
      setAddressResolveError(tr("Wpisz adres lub miasto, aby ustalic pinezke.", "Enter address or city to resolve marker position."));
      setAddressResolveErrorIndex(index);
      return;
    }

    setAddressResolveIndex(index);
    setAddressResolveError(null);
    setAddressResolveErrorIndex(null);

    try {
      const queries = [
        query,
        [stop.address, stop.city].map((part) => part?.trim()).filter(Boolean).join(", "),
        [stop.city, stop.zipCode].map((part) => part?.trim()).filter(Boolean).join(", "),
      ].filter((item, idx, arr) => item && arr.indexOf(item) === idx);

      let first: {
        lat?: string;
        lon?: string;
        display_name?: string;
        name?: string;
        address?: Record<string, string | undefined>;
      } | null = null;

      for (const lookupQuery of queries) {
        const params = new URLSearchParams({ q: lookupQuery, lang: locale });
        const response = await fetch(`/api/geocode/search?${params}`);
        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
          name?: string;
          address?: Record<string, string | undefined>;
        }>;

        if (payload.length > 0) {
          first = payload[0] ?? null;
          break;
        }
      }

      if (!first) {
        throw new Error(tr("Nie znaleziono wspolrzednych dla podanego adresu.", "No coordinates found for the provided address."));
      }

      const lat = Number(first?.lat);
      const lng = Number(first?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error(tr("Nie znaleziono wspolrzednych dla podanego adresu.", "No coordinates found for the provided address."));
      }

      const address = first?.address ?? {};
      const streetParts = [address.road, address.house_number].filter(Boolean).join(" ").trim();
      const city = address.city || address.town || address.village || address.municipality || stop.city || "";
      const zipCode = address.postcode || stop.zipCode || "";

      updateStop(index, {
        lat,
        lng,
        address: stop.address?.trim() ? stop.address : streetParts || first?.display_name || "",
        city,
        zipCode,
      });
      setAddressResolveError(null);
      setAddressResolveErrorIndex(null);
    } catch (error) {
      setAddressResolveError(error instanceof Error ? error.message : tr("Nie udalo sie odczytac wspolrzednych.", "Unable to resolve coordinates."));
      setAddressResolveErrorIndex(index);
    } finally {
      setAddressResolveIndex(null);
    }
  };

  return (
    <section id="section-route" className="rounded-3xl border border-sky-200 bg-sky-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-300 text-xs font-bold text-sky-950">3</div>
            <h3 className="text-base font-semibold text-slate-900">{tr("Trasa sprzedawcy", "Seller route")}</h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {tr(
              "Dodaj kolejne punkty, w ktorych pojawiasz sie z oferta. Kolejnosc punktow tworzy publiczna trase sklepu.",
              "Add stops where you regularly show up with your offer. Their order becomes the public shop route.",
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={addStop}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {tr("Dodaj punkt", "Add stop")}
        </button>
      </div>

      {value.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-sky-300 bg-white/80 px-5 py-6 text-sm text-slate-600">
          {tr(
            "Nie masz jeszcze punktow trasy. Dodaj pierwszy punkt i przypisz go na mapie.",
            "You do not have route stops yet. Add your first stop and place it on the map.",
          )}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4">
            {value.map((stop, index) => (
              <article key={stop.id ?? `${stop.label}-${index}`} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{stop.label?.trim() || tr("Nowy punkt", "New stop")}</p>
                      <p className="text-xs text-slate-500">{plAddress(stop as SearchResult) || tr("Brak adresu", "No address yet")}</p>
                      {stop.availableFrom || stop.availableTo ? (
                        <p className="text-xs text-slate-500">
                          {formatAvailability(stop.availableFrom, locale) || tr("Dowolny start", "Any start")}
                          {" → "}
                          {formatAvailability(stop.availableTo, locale) || tr("bez konca", "no end")}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isStopExpanded(stop, index) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setPickerIndex(index);
                            setPickerSearch([stop.label, stop.address, stop.city].filter(Boolean).join(", "));
                            setPickerResults([]);
                            setPickerError(null);
                          }}
                          className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          {tr("Wybierz na mapie", "Pick on map")}
                        </button>
                        <button type="button" onClick={() => removeStop(index)} className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                          {tr("Usun", "Remove")}
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmStop(stop, index)}
                          className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          {tr("Zatwierdz punkt", "Confirm stop")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => moveStop(index, -1)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          {tr("Wyzej", "Up")}
                        </button>
                        <button type="button" onClick={() => moveStop(index, 1)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                          {tr("Nizej", "Down")}
                        </button>
                        <button
                          type="button"
                          onClick={() => openStopEditor(stop, index)}
                          className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          {tr("Edytuj", "Edit")}
                        </button>
                        <button type="button" onClick={() => removeStop(index)} className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                          {tr("Usun", "Remove")}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isStopExpanded(stop, index) ? (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm text-slate-700 sm:col-span-2">
                        <span className="font-medium">{tr("Nazwa punktu", "Stop label")}</span>
                        <input
                          value={stop.label}
                          onChange={(event) => updateStop(index, { label: event.target.value })}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700 sm:col-span-2">
                        <span className="font-medium">{tr("Adres", "Address")}</span>
                        <input
                          value={stop.address ?? ""}
                          onChange={(event) => updateStop(index, { address: event.target.value })}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={() => resolveStopCoordinates(index)}
                          disabled={addressResolveIndex === index}
                          className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                        >
                          {addressResolveIndex === index ? tr("Ustalam pinezke...", "Resolving marker...") : tr("Ustal pinezke po adresie", "Resolve marker from address")}
                        </button>
                      </div>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium">{tr("Miasto", "City")}</span>
                        <input
                          value={stop.city ?? ""}
                          onChange={(event) => updateStop(index, { city: event.target.value })}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium">{tr("Kod pocztowy", "Postal code")}</span>
                        <input
                          value={stop.zipCode ?? ""}
                          onChange={(event) => updateStop(index, { zipCode: event.target.value })}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700 sm:col-span-2">
                        <span className="font-medium">{tr("Notatka", "Note")}</span>
                        <textarea
                          value={stop.notes ?? ""}
                          onChange={(event) => updateStop(index, { notes: event.target.value })}
                          className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium">{tr("Od kiedy", "From")}</span>
                        <input
                          type="datetime-local"
                          value={toLocalDateTimeInput(stop.availableFrom)}
                          onChange={(event) => updateStop(index, { availableFrom: fromLocalDateTimeInput(event.target.value) })}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-slate-700">
                        <span className="font-medium">{tr("Do kiedy", "To")}</span>
                        <input
                          type="datetime-local"
                          value={toLocalDateTimeInput(stop.availableTo)}
                          onChange={(event) => updateStop(index, { availableTo: fromLocalDateTimeInput(event.target.value) })}
                          className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                        />
                      </label>
                    </div>

                    {addressResolveError && addressResolveErrorIndex === index ? (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{addressResolveError}</div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">lat: {stop.lat.toFixed(5)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">lng: {stop.lng.toFixed(5)}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-3 py-1">lat: {stop.lat.toFixed(5)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">lng: {stop.lng.toFixed(5)}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">{tr("Zatwierdzony", "Confirmed")}</span>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="sticky top-6 self-start space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{tr("Podglad trasy", "Route preview")}</p>
              <p className="mt-1 text-sm text-slate-500">
                {tr("Tak trasa bedzie widoczna publicznie na profilu sklepu.", "This is how the route will appear publicly on the shop profile.")}
              </p>
              <ol className="mt-4 space-y-2">
                {value.map((stop, index) => (
                  <li key={stop.id ?? index} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="truncate text-sm font-semibold text-slate-900">{stop.label?.trim() || tr("Nowy punkt", "New stop")}</p>
                      <p className="truncate text-xs text-slate-500">{plAddress(stop as SearchResult) || "—"}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <SellerRouteMap stops={value} heightClassName="h-64" />
          </div>
        </div>
      )}

      {activePicker ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-4xl bg-white shadow-[0_32px_90px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-950">{tr("Wybierz punkt trasy", "Choose route stop")}</h4>
                <p className="mt-1 text-sm text-slate-500">
                  {tr(
                    "Wyszukaj lokalizacje albo kliknij bezposrednio na mapie. Klikniecie na mapie zaktualizuje wspolrzedne i sprobuje uzupelnic adres.",
                    "Search for a place or click directly on the map. Map clicks update coordinates and try to resolve the address.",
                  )}
                </p>
              </div>
              <button type="button" onClick={() => setPickerIndex(null)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {tr("Zamknij", "Close")}
              </button>
            </div>

            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    value={pickerSearch}
                    onChange={(event) => setPickerSearch(event.target.value)}
                    placeholder={tr("Np. targ broni Krakow", "Ex. military fair Krakow")}
                    className="h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-sm outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={pickerLoading}
                    className="rounded-full bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
                  >
                    {pickerLoading ? tr("Szukam...", "Searching...") : tr("Szukaj", "Search")}
                  </button>
                </div>

                {pickerError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{pickerError}</div> : null}

                <div className="max-h-105 space-y-2 overflow-y-auto pr-1">
                  {pickerResults.map((result) => (
                    <button
                      key={`${result.lat}-${result.lng}-${result.label}`}
                      type="button"
                      onClick={() => applySearchResult(result)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-sky-300 hover:bg-sky-50"
                    >
                      <p className="text-sm font-semibold text-slate-900">{result.label}</p>
                      <p className="mt-1 text-sm text-slate-600">{plAddress(result)}</p>
                      <p className="mt-2 text-xs text-slate-500">{result.lat.toFixed(5)}, {result.lng.toFixed(5)}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">{tr("Aktualnie wybrany punkt", "Currently selected stop")}</p>
                  <p className="mt-2">{plAddress({ ...activePicker.stop, label: activePicker.stop.label } as SearchResult) || tr("Adres nie zostal jeszcze uzupelniony.", "Address has not been resolved yet.")}</p>
                  <p className="mt-2 text-xs text-slate-500">lat: {activePicker.stop.lat.toFixed(5)} • lng: {activePicker.stop.lng.toFixed(5)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <RouteStopPickerMap
                  lat={activePicker.stop.lat}
                  lng={activePicker.stop.lng}
                  onPick={handleMapPick}
                  pins={mapPins}
                  selectedLabel={activePicker.stop.label}
                  selectedAddress={activePicker.stop.address}
                  selectedCity={activePicker.stop.city}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => resolveStopCoordinates(activePicker.index)}
                      disabled={addressResolveIndex === activePicker.index}
                      className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                    >
                      {addressResolveIndex === activePicker.index ? tr("Ustalam pinezke...", "Resolving marker...") : tr("Ustal pinezke po adresie", "Resolve marker from address")}
                    </button>
                  </div>
                  <label className="grid gap-2 text-sm text-slate-700 sm:col-span-2">
                    <span className="font-medium">{tr("Adres", "Address")}</span>
                    <input
                      value={activePicker.stop.address ?? ""}
                      onChange={(event) => updateStop(activePicker.index, { address: event.target.value })}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">{tr("Miasto", "City")}</span>
                    <input
                      value={activePicker.stop.city ?? ""}
                      onChange={(event) => updateStop(activePicker.index, { city: event.target.value })}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">{tr("Kod pocztowy", "Postal code")}</span>
                    <input
                      value={activePicker.stop.zipCode ?? ""}
                      onChange={(event) => updateStop(activePicker.index, { zipCode: event.target.value })}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">{tr("Od kiedy", "From")}</span>
                    <input
                      type="datetime-local"
                      value={toLocalDateTimeInput(activePicker.stop.availableFrom)}
                      onChange={(event) => updateStop(activePicker.index, { availableFrom: fromLocalDateTimeInput(event.target.value) })}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">{tr("Do kiedy", "To")}</span>
                    <input
                      type="datetime-local"
                      value={toLocalDateTimeInput(activePicker.stop.availableTo)}
                      onChange={(event) => updateStop(activePicker.index, { availableTo: fromLocalDateTimeInput(event.target.value) })}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3"
                    />
                  </label>
                </div>

                {addressResolveError && addressResolveErrorIndex === activePicker.index ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{addressResolveError}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}