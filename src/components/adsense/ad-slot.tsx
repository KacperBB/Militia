"use client";

import Script from "next/script";
import { useEffect } from "react";

type AdSlotProps = {
  slot: string;
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdSlot({ slot, className }: AdSlotProps) {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  useEffect(() => {
    try {
      if (!client) {
        return;
      }

      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore duplicate ad push errors from client-side navigations.
    }
  }, [client, slot]);

  if (!client || !slot) {
    return null;
  }

  return (
    <>
      <Script
        id="adsense-loader"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
        crossOrigin="anonymous"
      />
      <ins
        className={`adsbygoogle block overflow-hidden rounded-xl border border-slate-200 bg-white ${className ?? ""}`}
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </>
  );
}
