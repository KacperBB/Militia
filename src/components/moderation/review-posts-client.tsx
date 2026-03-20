"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";

type AdminPost = {
  id: string;
  title: string;
  status: string;
  isPromoted: boolean;
  city: string | null;
  expiresAt: string | null;
  author: {
    id: string;
    username: string | null;
    email: string;
  };
  postOpenFlags: number;
  authorOpenFlags: number;
};

export function ReviewPostsClient() {
  const { locale } = useLocale();
  const tr = useCallback((pl: string, en: string) => (locale === "en" ? en : pl), [locale]);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "IN_REVIEW" | "REVIEWED" | "PUBLISHED" | "EXPIRED" | "CANCELLED">("ALL");

  const statusLabel = useCallback(
    (status: string) => {
      switch (status) {
        case "DRAFT":
          return tr("Draft", "Draft");
        case "IN_REVIEW":
          return tr("W trakcie review", "In review");
        case "REVIEWED":
          return tr("Zreviewowane", "Reviewed");
        case "PUBLISHED":
          return tr("Opublikowane", "Published");
        case "EXPIRED":
          return tr("Wygasle", "Expired");
        case "CANCELLED":
          return tr("Anulowane", "Cancelled");
        default:
          return status;
      }
    },
    [tr],
  );

  const statusPillClass = useCallback((status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700";
      case "IN_REVIEW":
        return "bg-blue-100 text-blue-700";
      case "REVIEWED":
        return "bg-amber-100 text-amber-700";
      case "PUBLISHED":
        return "bg-emerald-100 text-emerald-700";
      case "EXPIRED":
        return "bg-rose-100 text-rose-700";
      case "CANCELLED":
        return "bg-slate-200 text-slate-600";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/posts", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie pobrac ogloszen.", "Failed to fetch listings."));
      }

      setPosts(data.posts || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tr("Nie udalo sie pobrac ogloszen.", "Failed to fetch listings."));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  async function updatePostStatus(postId: string, action: string) {
    setActionLoading(`${postId}:${action}`);
    setError(null);

    try {
      const response = await fetch(`/api/admin/posts/${postId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie zaktualizowac statusu.", "Failed to update status."));
      }

      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: data.post?.status ?? post.status,
                isPromoted: data.post?.is_promoted ?? data.post?.isPromoted ?? post.isPromoted,
                expiresAt: data.post?.expires_at ?? data.post?.expiresAt ?? post.expiresAt,
              }
            : post,
        ),
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : tr("Nie udalo sie zaktualizowac statusu.", "Failed to update status."));
    } finally {
      setActionLoading(null);
    }
  }

  const statusCounts = useCallback(
    (status: string) => posts.filter((post) => post.status === status).length,
    [posts],
  );

  const filteredPosts = posts.filter((post) => statusFilter === "ALL" || post.status === statusFilter);
  const statusTabs = [
    ["ALL", tr("Wszystkie", "All"), posts.length],
    ["DRAFT", tr("Draft", "Draft"), statusCounts("DRAFT")],
    ["IN_REVIEW", tr("W trakcie review", "In review"), statusCounts("IN_REVIEW")],
    ["REVIEWED", tr("Zreviewowane", "Reviewed"), statusCounts("REVIEWED")],
    ["PUBLISHED", tr("Opublikowane", "Published"), statusCounts("PUBLISHED")],
    ["EXPIRED", tr("Wygasle", "Expired"), statusCounts("EXPIRED")],
    ["CANCELLED", tr("Anulowane", "Cancelled"), statusCounts("CANCELLED")],
  ] as const;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">{tr("Review ogloszen", "Listings review")}</h2>
        <button
          type="button"
          onClick={() => void loadPosts()}
          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {tr("Odswiez", "Refresh")}
        </button>
      </div>

      <div className="mb-4 border-b border-slate-200">
        <div className="-mb-px flex flex-wrap gap-1 overflow-x-auto">
          {statusTabs.map(([value, label, count]) => {
            const isActive = statusFilter === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-slate-300 bg-white text-slate-900"
                    : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-slate-100 text-slate-700" : "bg-white text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-600">{tr("Ladowanie ogloszen...", "Loading listings...")}</p> : null}
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

      {!loading && !error ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-2 py-2">{tr("Tytul", "Title")}</th>
                <th className="px-2 py-2">{tr("Status", "Status")}</th>
                <th className="px-2 py-2">{tr("Flagi", "Flags")}</th>
                <th className="px-2 py-2">{tr("Akcje", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <tr key={post.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 font-semibold text-slate-900">
                    <Link href={`/ogloszenia/${post.id}`} className="hover:text-amber-700">
                      {post.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">{post.city || "-"}</p>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(post.status)}`}>
                      {statusLabel(post.status)}
                    </span>
                    {post.isPromoted ? (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                        {tr("Promoted", "Promoted")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                      {post.postOpenFlags + post.authorOpenFlags}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/ogloszenia/${post.id}/edytuj`}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {tr("Edytuj", "Edit")}
                      </Link>

                      {post.status === "DRAFT" || post.status === "REVIEWED" ? (
                        <button
                          type="button"
                          onClick={() => void updatePostStatus(post.id, "REVIEW_POST")}
                          disabled={actionLoading === `${post.id}:REVIEW_POST`}
                          className="rounded-md border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                        >
                          {tr("Review post", "Review post")}
                        </button>
                      ) : null}

                      {post.status === "IN_REVIEW" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void updatePostStatus(post.id, "REVIEWED")}
                            disabled={actionLoading === `${post.id}:REVIEWED`}
                            className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                          >
                            {tr("Reviewed", "Reviewed")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void updatePostStatus(post.id, "REVIEWED_PUBLISHED")}
                            disabled={actionLoading === `${post.id}:REVIEWED_PUBLISHED`}
                            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                          >
                            {tr("Reviewed & Published", "Reviewed & Published")}
                          </button>
                        </>
                      ) : null}

                      {post.status === "REVIEWED" ? (
                        <button
                          type="button"
                          onClick={() => void updatePostStatus(post.id, "PUBLISH")}
                          disabled={actionLoading === `${post.id}:PUBLISH`}
                          className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                        >
                          {tr("Publish", "Publish")}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
