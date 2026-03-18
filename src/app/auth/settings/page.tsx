import { redirect } from "next/navigation";

import { SettingsPageContent } from "@/components/auth/settings-page-content";
import { getCurrentSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user;

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
              marketingConsent: user.company.marketing_consent,
            }
          : null
      }
    />
  );
}
