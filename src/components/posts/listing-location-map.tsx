"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type Props = {
  lat: number;
  lng: number;
  city: string | null;
  address?: string | null;
  radiusKm?: number;
};

export function ListingLocationMap({ lat, lng, city, address, radiusKm = 20 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("leaflet/dist/leaflet.css");
      const { default: L } = await import("leaflet");

      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 10,
        scrollWheelZoom: false,
        zoomControl: true,
      });

      cleanupRef.current = () => map.remove();

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const markerIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 8px rgba(239,68,68,0.5)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);

      if (city) {
        marker.bindTooltip(city, { permanent: true, direction: "top", offset: [0, -10] });
      }

      L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: "#0ea5e9",
        fillColor: "#0ea5e9",
        fillOpacity: 0.08,
        weight: 2,
        dashArray: "6 5",
      }).addTo(map);
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [lat, lng, city, radiusKm]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height: "320px" }}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[1000] flex items-end justify-between gap-2">
        <div className="pointer-events-auto max-w-[60%] rounded-xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-slate-200/80 backdrop-blur">
          {address ? (
            <p className="text-xs font-semibold text-slate-900 leading-snug">{address}</p>
          ) : city ? (
            <p className="text-xs font-semibold text-slate-900 leading-snug">{city}</p>
          ) : null}
          <p className="mt-0.5 text-[11px] text-slate-500">Obszar orientacyjny ~{radiusKm} km</p>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3H8v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
          </svg>
          Wyznacz trasę
        </a>
      </div>
    </div>
  );
}
