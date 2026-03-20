import { redirect } from "next/navigation";

import { ReviewPostsClient } from "@/components/moderation/review-posts-client";
import { getCurrentSession } from "@/lib/auth/session";

export default async function AdminPostsPage() {
  const session = await getCurrentSession();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <header className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-bold text-slate-900">Zarządzanie postami</h1>
        <p className="mt-1 text-sm text-slate-600">Panel administratora do review, publikacji i zarządzania statusami ogłoszeń.</p>
      </header>
      <ReviewPostsClient />
    </main>
  );
}