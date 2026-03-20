import type { MetadataRoute } from "next";

import { db } from "@/lib/db";
import { POST_STATUSES, applyPostLifecycle } from "@/lib/posts/status";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").split(",")[0].replace(/\/$/, "");

  await applyPostLifecycle();

  const posts = await db.posts.findMany({
    where: { status: POST_STATUSES.PUBLISHED, deleted_at: null },
    select: { id: true, updated_at: true },
    orderBy: { published_at: "desc" },
    take: 5000,
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${appUrl}/ogloszenia`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${appUrl}/auth/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${appUrl}/auth/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${appUrl}/ogloszenia/${post.id}`,
    lastModified: post.updated_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes];
}
