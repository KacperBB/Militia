import { Suspense } from "react";

import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-6 py-10">
      <div className="w-full max-w-2xl">
        <Suspense fallback={<p className="text-sm text-slate-600">Ladowanie weryfikacji email...</p>}>
          <VerifyEmailPanel />
        </Suspense>
      </div>
    </main>
  );
}
