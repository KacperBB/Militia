// @ts-nocheck
"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";

type SellerRouteMapProps = {
  stops: Array<{
    label: string;
    address?: string;
    city?: string;
    zipCode?: string;
    notes?: string;
    availableFrom?: string;
    availableTo?: string;
    lat: number;
    lng: number;
  }>;
  heightClassName?: string;
};

function formatWindow(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function SellerRouteMap({ stops, heightClassName = "h-[360px]" }: SellerRouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const directionsUrl = useMemo(() => {
    if (stops.length === 0) {
      return null;
    }

    const origin = `${stops[0].lat},${stops[0].lng}`;
    const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
    const url = new URL("https://www.google.com/maps/dir/");
    url.searchParams.set("api", "1");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);

    if (stops.length > 2) {
      url.searchParams.set(
        "waypoints",
        stops
          .slice(1, -1)
          .map((stop) => `${stop.lat},${stop.lng}`)
          .join("|"),
      );
    }

    return url.toString();
  }, [stops]);

  useEffect(() => {
    if (!containerRef.current || stops.length === 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { default: L } = await import("leaflet");
      if (cancelled || !containerRef.current) {
        return;
      }

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      });

      cleanupRef.current = () => map.remove();

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const points = stops.map((stop) => [stop.lat, stop.lng]);

      L.polyline(points, {
        color: "#0f172a",
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      stops.forEach((stop, index) => {
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:999px;background:${index === 0 ? "#f59e0b" : "#0f172a"};border:3px solid #fff;color:#fff;font-size:12px;font-weight:700;box-shadow:0 10px 20px rgba(15,23,42,0.2)">${index + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const summary = [stop.address, stop.zipCode, stop.city].filter(Boolean).join(", ");
        const from = formatWindow(stop.availableFrom);
        const to = formatWindow(stop.availableTo);
        const availability = from || to ? `<br/><em>Dostepnosc: ${from || "od teraz"} - ${to || "bez konca"}</em>` : "";
        L.marker([stop.lat, stop.lng], { icon })
          .bindPopup(`<strong>${stop.label}</strong>${summary ? `<br/>${summary}` : ""}${availability}${stop.notes ? `<br/>${stop.notes}` : ""}`)
          .addTo(map);
      });

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: stops.length === 1 ? 13 : 11 });
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [stops]);

  if (stops.length === 0) {
    return null;
  }

  return (
    <div className="isolate space-y-3">
      <div className={`relative overflow-hidden rounded-3xl ${heightClassName}`}>
        <div ref={containerRef} className="absolute inset-0" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span>Trasa obejmuje {stops.length} {stops.length === 1 ? "punkt" : stops.length < 5 ? "punkty" : "punktow"}.</span>
        {directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Otworz trase w Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}