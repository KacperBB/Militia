import type { Metadata } from "next";

import { HomePageContent } from "@/components/home/home-page-content";
import { getCurrentSession } from "@/lib/auth/session";
import { getAppUrl, SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: getAppUrl(),
    type: "website",
  },
};

export default async function Home() {
  const session = await getCurrentSession();
  const user = session
    ? {
        email: session.user.email,
        username: session.user.username,
        role: session.user.role,
      }
    : null;

  return <HomePageContent user={user} />;
}
