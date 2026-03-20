// @ts-nocheck
"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type RouteStopPickerPin = {
  lat: number;
  lng: number;
  label?: string;
  address?: string;
  city?: string;
};

type RouteStopPickerMapProps = {
  lat?: number;
  lng?: number;
  pins?: RouteStopPickerPin[];
  onPick?: (lat: number, lng: number) => void;
  selectedLabel?: string;
  selectedAddress?: string;
  selectedCity?: string;
};

export function RouteStopPickerMap({
  lat,
  lng,
  pins = [],
  onPick,
  selectedLabel,
  selectedAddress,
  selectedCity,
}: RouteStopPickerMapProps) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const searchLayerRef = useRef(null);
  // Keep latest onPick in a ref so the map init effect never needs to re-run when the callback changes.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { default: L } = await import("leaflet");
      if (cancelled || !containerRef.current) {
        return;
      }

      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: [52.069, 19.48],
        zoom: 6,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (event) => {
        onPickRef.current?.(event.latlng.lat, event.latlng.lng);
      });

      mapRef.current = map;
      searchLayerRef.current = L.layerGroup().addTo(map);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) {
      return;
    }

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (typeof lat === "number" && typeof lng === "number") {
      const markerIcon = L.divIcon({
        className: "",
        html: '<div style="width:18px;height:18px;border-radius:999px;background:#0f172a;border:4px solid #38bdf8;box-shadow:0 8px 18px rgba(15,23,42,0.22)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      selectedMarkerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      const markerSummary = [selectedLabel, selectedAddress, selectedCity].filter(Boolean).join(" • ");
      selectedMarkerRef.current.bindTooltip(markerSummary || "Wybrany punkt", {
        direction: "top",
        offset: [0, -12],
      });
      selectedMarkerRef.current.openTooltip();
      map.setView([lat, lng], Math.max(map.getZoom(), 12));
    }
  }, [lat, lng, selectedLabel, selectedAddress, selectedCity]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layer = searchLayerRef.current;
    if (!map || !L || !layer) {
      return;
    }

    layer.clearLayers();

    pins.forEach((pin, index) => {
      if (typeof pin.lat !== "number" || typeof pin.lng !== "number") {
        return;
      }

      const icon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:999px;background:${index === 0 ? "#f59e0b" : "#2563eb"};border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,0.28)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([pin.lat, pin.lng], { icon })
        .bindTooltip(pin.label || pin.address || pin.city || "Punkt", { direction: "top" })
        .addTo(layer);
    });

    if (pins.length > 0 && (typeof lat !== "number" || typeof lng !== "number")) {
      map.setView([pins[0].lat, pins[0].lng], 11);
    }
  }, [lat, lng, pins]);

  return <div ref={containerRef} className="h-80 w-full rounded-3xl" />;
}