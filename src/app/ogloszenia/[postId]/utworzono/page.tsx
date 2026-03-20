import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { CreatedPostRedirect } from "./redirect-client";

export default async function ListingCreatedPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/auth/login");
  }

  const { postId } = await params;
  const post = await db.posts.findUnique({
    where: { id: postId },
    select: { id: true, created_by: true, title: true, status: true },
  });

  if (!post || post.created_by !== session.user.id) {
    redirect("/dashboard/user/listings");
  }

  const targetHref = `/ogloszenia/${post.id}`;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-4 md:p-6">
      <section className="w-full rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <CreatedPostRedirect href={targetHref} delayMs={3000} />
        <div className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Post został poprawnie dodany
        </div>
        <h1 className="mt-4 text-3xl font-bold text-slate-950">{post.title}</h1>
        <p className="mt-3 text-sm text-slate-700">
          Ogłoszenie zostało zapisane poprawnie. Za chwilę nastąpi przekierowanie do podglądu posta.
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Aktualny status:</span> {post.status}
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={targetHref} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Przejdź do posta teraz
          </Link>
          <Link href="/dashboard/user/listings" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Wróć do moich ogłoszeń
          </Link>
        </div>
      </section>
    </main>
  );
}