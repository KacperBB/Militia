import assert from "node:assert/strict";
import test from "node:test";

import {
  companyRouteStopsSchema,
  normalizeCompanyRouteStops,
  serializeCompanyRouteStops,
} from "../src/lib/company-route";

test("companyRouteStopsSchema accepts ordered valid route stops", () => {
  const result = companyRouteStopsSchema.safeParse([
    {
      label: "Krakow targ",
      address: "ul. Centralna 41A",
      city: "Krakow",
      zipCode: "31-586",
      notes: "Sobota rano",
      lat: 50.06857,
      lng: 19.97991,
    },
    {
      label: "Rzeszow odbior",
      address: "ul. Rejtana 20",
      city: "Rzeszow",
      zipCode: "35-310",
      lat: 50.02173,
      lng: 22.00471,
    },
  ]);

  assert.equal(result.success, true);
});

test("companyRouteStopsSchema allows duplicate coordinates", () => {
  const result = companyRouteStopsSchema.safeParse([
    {
      label: "Krakow 1",
      address: "ul. Centralna 41A",
      city: "Krakow",
      lat: 50.06857,
      lng: 19.97991,
    },
    {
      label: "Krakow 2",
      address: "ul. Centralna 41A",
      city: "Krakow",
      lat: 50.06857,
      lng: 19.97991,
    },
  ]);

  assert.equal(result.success, true);
});

test("companyRouteStopsSchema rejects invalid availability window", () => {
  const result = companyRouteStopsSchema.safeParse([
    {
      label: "Krakow 1",
      address: "ul. Centralna 41A",
      city: "Krakow",
      availableFrom: "2026-03-21T12:00:00.000Z",
      availableTo: "2026-03-20T12:00:00.000Z",
      lat: 50.06857,
      lng: 19.97991,
    },
  ]);

  assert.equal(result.success, false);
});

test("companyRouteStopsSchema rejects stop without address and city", () => {
  const result = companyRouteStopsSchema.safeParse([
    {
      label: "Pusty punkt",
      lat: 50.06857,
      lng: 19.97991,
    },
  ]);

  assert.equal(result.success, false);
});

test("normalizeCompanyRouteStops assigns sequential sort order", () => {
  const normalized = normalizeCompanyRouteStops([
    {
      label: "Stop A",
      address: "Adres A",
      city: "Krakow",
      lat: 50.1,
      lng: 19.9,
    },
    {
      label: "Stop B",
      address: "Adres B",
      city: "Warszawa",
      lat: 52.2,
      lng: 21.0,
    },
  ]);

  assert.deepEqual(
    normalized.map((item) => item.sort_order),
    [0, 1],
  );
});

test("serializeCompanyRouteStops converts decimal-like coordinates to numbers", () => {
  const serialized = serializeCompanyRouteStops([
    {
      id: "route-stop-1",
      label: "Warszawa",
      address: "Al. Jerozolimskie 1",
      city: "Warszawa",
      zip_code: "00-001",
      notes: null,
      lat: { toString: () => "52.22977" },
      lng: { toString: () => "21.01178" },
    },
  ]);

  assert.equal(serialized[0]?.lat, 52.22977);
  assert.equal(serialized[0]?.lng, 21.01178);
});