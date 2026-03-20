type GeocodeResult = {
  lat: number;
  lng: number;
};

type GooglePlacesResponse = {
  places?: Array<{
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
};

type NominatimResponse = Array<{
  lat?: string;
  lon?: string;
}>;

function toFiniteNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

async function geocodeWithGoogle(city: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.location",
    },
    body: JSON.stringify({
      textQuery: `${city}, Poland`,
      languageCode: "pl",
      regionCode: "PL",
      maxResultCount: 1,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GooglePlacesResponse;
  const first = payload.places?.[0];
  const lat = toFiniteNumber(first?.location?.latitude);
  const lng = toFiniteNumber(first?.location?.longitude);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

async function geocodeWithNominatim(city: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${city}, Poland`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "pl,en;q=0.8",
      "User-Agent": "militia/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as NominatimResponse;
  const first = payload[0];
  const lat = toFiniteNumber(first?.lat);
  const lng = toFiniteNumber(first?.lon);

  if (lat === null || lng === null) {
    return null;
  }

  return { lat, lng };
}

export async function geocodePolishCity(city: string): Promise<GeocodeResult | null> {
  const normalizedCity = city.trim();

  if (normalizedCity.length < 2) {
    return null;
  }

  const googleResult = await geocodeWithGoogle(normalizedCity);
  if (googleResult) {
    return googleResult;
  }

  return geocodeWithNominatim(normalizedCity);
}
