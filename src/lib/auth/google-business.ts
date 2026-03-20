type GooglePlaceSearchResponse = {
  places?: Array<{
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    googleMapsUri?: string;
    websiteUri?: string;
    businessStatus?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
};

type NominatimSearchResponseItem = {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    shop?: string;
    amenity?: string;
    city?: string;
    town?: string;
    village?: string;
    road?: string;
    house_number?: string;
    postcode?: string;
  };
};

export type BusinessLookupResult = {
  id: string;
  name: string;
  address?: string;
  streetAddress?: string;
  city?: string;
  zipCode?: string;
  phone?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  businessStatus?: string;
  lat?: number;
  lng?: number;
};

type BusinessLookupResponse = {
  enabled: boolean;
  reason: string | null;
  results: BusinessLookupResult[];
};

function uniqueById(items: BusinessLookupResult[]) {
  const seen = new Set<string>();
  const result: BusinessLookupResult[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    result.push(item);
  }

  return result;
}

async function lookupBusinessesFromNominatim(query: string, city?: string): Promise<BusinessLookupResponse> {
  const searchVariants = [
    city ? `${query}, ${city}, Poland` : null,
    `${query}, Poland`,
    query,
  ].filter((item): item is string => Boolean(item));

  const aggregated: BusinessLookupResult[] = [];

  for (const searchText of searchVariants) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", searchText);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "8");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "User-Agent": "militia-app/1.0 (company-lookup)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
    }

    const data = (await response.json()) as NominatimSearchResponseItem[];
    const partialResults = data
      .filter((item) => item.display_name)
      .map((item) => {
        const cityLabel = item.address?.city || item.address?.town || item.address?.village || city || "";
        const road = item.address?.road || "";
        const houseNumber = item.address?.house_number || "";
        const postcode = item.address?.postcode || "";
        const nameGuess = item.address?.shop || item.address?.amenity || item.name || query;
        const streetAddress = [road, houseNumber].filter(Boolean).join(" ").trim();
        const addressLabel = streetAddress || item.display_name;

        return {
          id: `osm-${item.place_id}`,
          name: nameGuess,
          address: addressLabel,
          streetAddress: streetAddress || undefined,
          city: cityLabel || undefined,
          zipCode: postcode || undefined,
          businessStatus: "UNKNOWN",
          lat: Number(item.lat),
          lng: Number(item.lon),
        } satisfies BusinessLookupResult;
      });

    aggregated.push(...partialResults);
  }

  const results = uniqueById(aggregated);

  return {
    enabled: true,
    reason: null,
    results,
  };
}

export async function lookupBusinesses(query: string, city?: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    const fallback = await lookupBusinessesFromNominatim(query, city);
    if (fallback.enabled) {
      return fallback;
    }

    return {
      enabled: false,
      reason: "GOOGLE_PLACES_API_KEY is not configured and OSM fallback failed.",
      results: [] as BusinessLookupResult[],
    };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.googleMapsUri,places.websiteUri,places.businessStatus,places.location",
    },
    body: JSON.stringify({
      textQuery: city ? `${query}, ${city}, Poland` : `${query}, Poland`,
      languageCode: "pl",
      regionCode: "PL",
      maxResultCount: 5,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let reason = `Google Places lookup failed with status ${response.status}.`;

    try {
      const errorPayload = (await response.json()) as {
        error?: { message?: string };
      };

      if (errorPayload.error?.message) {
        reason = errorPayload.error.message;
      }
    } catch {
      // Ignore malformed upstream error payloads and keep the fallback reason.
    }

    const fallback = await lookupBusinessesFromNominatim(query, city);
    if (fallback.enabled && fallback.results.length > 0) {
      return {
        ...fallback,
        reason: "Google Places niedostępne. Pokazano wyniki z OpenStreetMap.",
      };
    }

    return {
      enabled: true,
      reason: "Google Places niedostępne. Nie znaleziono dopasowań w OpenStreetMap.",
      results: [] as BusinessLookupResult[],
    };
  }

  const data = (await response.json()) as GooglePlaceSearchResponse;

  return {
    enabled: true,
    reason: null,
    results: (data.places ?? []).map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? "Unknown business",
      address: place.formattedAddress,
      streetAddress: place.formattedAddress,
      phone: place.nationalPhoneNumber,
      googleMapsUrl: place.googleMapsUri,
      websiteUrl: place.websiteUri,
      businessStatus: place.businessStatus,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    })),
  };
}
