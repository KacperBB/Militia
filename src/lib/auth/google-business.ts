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

export type BusinessLookupResult = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  businessStatus?: string;
  lat?: number;
  lng?: number;
};

export async function lookupBusinesses(query: string, city?: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return {
      enabled: false,
      reason: "GOOGLE_PLACES_API_KEY is not configured.",
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

    return {
      enabled: false,
      reason,
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
      phone: place.nationalPhoneNumber,
      googleMapsUrl: place.googleMapsUri,
      websiteUrl: place.websiteUri,
      businessStatus: place.businessStatus,
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    })),
  };
}
