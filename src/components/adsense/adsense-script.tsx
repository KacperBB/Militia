"use client";

import Script from "next/script";

export function AdsenseScript() {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT;

  if (!client || !client.startsWith("ca-pub-")) {
    return null;
  }

  return (
    <Script
      id="adsense-loader-global"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
