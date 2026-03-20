import test from "node:test";
import assert from "node:assert/strict";

import { geocodePolishCity } from "../src/lib/location/geocode";

test("geocodePolishCity returns null for too-short city", async () => {
  const result = await geocodePolishCity(" ");
  assert.equal(result, null);
});

test("geocodePolishCity uses Google first when configured", async () => {
  const previousFetch = global.fetch;
  const previousApiKey = process.env.GOOGLE_PLACES_API_KEY;

  process.env.GOOGLE_PLACES_API_KEY = "test-key";

  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        places: [{ location: { latitude: 52.2297, longitude: 21.0122 } }],
      }),
    } as Response;
  }) as typeof fetch;

  const result = await geocodePolishCity("Warszawa");

  assert.deepEqual(result, { lat: 52.2297, lng: 21.0122 });

  global.fetch = previousFetch;
  process.env.GOOGLE_PLACES_API_KEY = previousApiKey;
});

test("geocodePolishCity falls back to Nominatim when Google does not resolve", async () => {
  const previousFetch = global.fetch;
  const previousApiKey = process.env.GOOGLE_PLACES_API_KEY;
  process.env.GOOGLE_PLACES_API_KEY = "test-key";

  let callCount = 0;
  global.fetch = (async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        ok: true,
        json: async () => ({ places: [] }),
      } as Response;
    }

    return {
      ok: true,
      json: async () => [{ lat: "50.0614", lon: "19.9366" }],
    } as Response;
  }) as typeof fetch;

  const result = await geocodePolishCity("Krakow");

  assert.deepEqual(result, { lat: 50.0614, lng: 19.9366 });

  global.fetch = previousFetch;
  process.env.GOOGLE_PLACES_API_KEY = previousApiKey;
});
