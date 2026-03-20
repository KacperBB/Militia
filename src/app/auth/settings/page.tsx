import { redirect } from "next/navigation";

import { SettingsPageContent } from "@/components/auth/settings-page-content";
import { serializeCompanyRouteStops } from "@/lib/company-route";
import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user;
  const routeStops = user.company_id
    ? await db.company_route_stops.findMany({
        where: { company_id: user.company_id },
        orderBy: { sort_order: "asc" },
        select: {
          id: true,
          label: true,
          address: true,
          city: true,
          zip_code: true,
          notes: true,
          available_from: true,
          available_to: true,
          lat: true,
          lng: true,
        },
      })
    : [];

  return (
    <SettingsPageContent
      initialUser={{
        username: user.username ?? "",
        firstName: user.first_name ?? "",
        lastName: user.last_name ?? "",
        phone: user.phone ?? "",
        avatarUrl: user.avatar_url ?? "",
        marketingConsent: user.marketing_consent,
      }}
      initialCompany={
        user.company
          ? {
              name: user.company.name ?? "",
              nip: user.company.nip ?? "",
              email: user.company.email ?? "",
              phone: user.company.phone ?? "",
              address: user.company.address ?? "",
              zipCode: user.company.zip_code ?? "",
              city: user.company.city ?? "",
              description: user.company.description ?? "",
              avatarUrl: user.company.avatar_url ?? "",
              bannerUrl: user.company.banner_url ?? "",
              marketingConsent: user.company.marketing_consent,
            }
          : null
      }
      initialRouteStops={serializeCompanyRouteStops(routeStops)}
    />
  );
}
