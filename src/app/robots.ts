import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").split(",")[0].replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ogloszenia", "/ogloszenia/"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/auth/settings",
          "/u/",
          "/_next/",
        ],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
