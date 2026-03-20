import type { Metadata } from "next";

import { RegisterPageView } from "@/components/auth/register-page-view";

export const metadata: Metadata = {
  title: "Rejestracja",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  return <RegisterPageView />;
}
