import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportFlagWizardTrigger } from "@/components/moderation/report-flag-wizard-trigger";
import { db } from "@/lib/db";

export default async function UserPublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar_url: true,
      created_at: true,
      posts_created: {
        where: {
          status: "PUBLISHED",
          deleted_at: null,
        },
        orderBy: [{ created_at: "desc" }],
        select: {
          id: true,
          title: true,
          city: true,
          created_at: true,
        },
        take: 30,
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.username || user.email}</h1>
            <p className="mt-1 text-sm text-slate-600">Profil uzytkownika</p>
            <p className="mt-2 text-xs text-slate-500">Data dolaczenia: {new Date(user.created_at).toLocaleDateString("pl-PL")}</p>
          </div>
          <ReportFlagWizardTrigger
            targetType="USER"
            targetId={user.id}
            categoriesTargetType="USER"
            triggerLabel="Zglos uzytkownika"
            modalTitle="Zgloszenie uzytkownika"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Ogloszenia uzytkownika</h2>
        <div className="mt-3 space-y-2">
          {user.posts_created.length === 0 ? (
            <p className="text-sm text-slate-500">Brak opublikowanych ogloszen.</p>
          ) : (
            user.posts_created.map((post) => (
              <div key={post.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div>
                  <Link href={`/ogloszenia/${post.id}`} className="text-sm font-semibold text-slate-900 hover:text-amber-700">
                    {post.title}
                  </Link>
                  <p className="text-xs text-slate-500">{post.city || "-"}</p>
                </div>
                <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString("pl-PL")}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
