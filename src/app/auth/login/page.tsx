import type { Metadata } from "next";
import { LoginPageView } from "@/components/auth/login-page-view";

export const metadata: Metadata = {
  title: "Logowanie",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginPageView />;
}
