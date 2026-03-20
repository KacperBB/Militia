"use client";

import { useEffect, useRef } from "react";

type AdSlotProps = {
  slot: string;
  className?: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  responsive?: boolean;
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdSlot({ slot, className, format = "auto", responsive = true }: AdSlotProps) {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    try {
      if (!client) {
        return;
      }

      const adElement = insRef.current;
      if (!adElement) {
        return;
      }

      if (adElement.getAttribute("data-adsbygoogle-status") === "done") {
        return;
      }

      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore duplicate ad push errors from client-side navigations.
    }
  }, [client, slot, format, responsive]);

  if (!client || !slot) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Reklama</p>
      <ins
        ref={insRef}
        className={`adsbygoogle block overflow-hidden rounded-xl border border-slate-200 bg-white ${className ?? ""}`}
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
