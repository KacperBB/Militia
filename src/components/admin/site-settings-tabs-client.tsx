"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ModerationFlagCategoriesImportClient } from "@/components/admin/moderation-flag-categories-import-client";
import { TaxonomyImportClient } from "@/components/admin/taxonomy-import-client";
import { useLocale } from "@/components/providers/locale-provider";

type Translator = (pl: string, en: string) => string;

type ReportFlag = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  createdBy: {
    id: string;
    username: string | null;
    email: string;
  } | null;
  postReference: {
    postId: string;
    postTitle: string | null;
  } | null;
};

type AdminUser = {
  id: string;
  username: string | null;
  email: string;
  avatarUrl: string | null;
  status: string;
  role: string;
  accountType: "COMPANY" | "PRIVATE";
  isActive: boolean;
  lastSeenAt: string | null;
  reports: {
    open: number;
    archived: number;
  };
};

type AdminPost = {
  id: string;
  title: string;
  status: string;
  isPromoted: boolean;
  city: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  author: {
    id: string;
    username: string | null;
    email: string;
  };
  postOpenFlags: number;
  authorOpenFlags: number;
};

type ReportsModalState = {
  open: boolean;
  loading: boolean;
  error: string | null;
  user: AdminUser | null;
  openFlags: ReportFlag[];
  archivedFlags: ReportFlag[];
};

function StatusDotButton({
  colorClass,
  onClick,
  title,
  disabled,
}: {
  colorClass: string;
  onClick: () => void;
  title: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className={`inline-block h-4 w-4 rounded-full ${colorClass}`} />
    </button>
  );
}

function ReportsModal({
  state,
  onClose,
  onArchive,
  tr,
  locale,
}: {
  state: ReportsModalState;
  onClose: () => void;
  onArchive: (flagId: string) => void;
  tr: Translator;
  locale: string;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Zgloszenia uzytkownika</h3>
            <p className="mt-1 text-sm text-slate-600">
              {state.user ? `${state.user.username || "(brak loginu)"} - ${state.user.email}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {tr("Zamknij", "Close")}
          </button>
        </div>

        {state.loading ? <p className="text-sm text-slate-600">{tr("Ladowanie zgloszen...", "Loading reports...")}</p> : null}
        {state.error ? <p className="text-sm font-semibold text-rose-700">{state.error}</p> : null}

        {!state.loading && !state.error ? (
          <div className="space-y-6">
            <section>
              <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-rose-700">{tr("Otwarte zgloszenia", "Open reports")}</h4>
              {state.openFlags.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{tr("Brak otwartych zgloszen.", "No open reports.")}</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {state.openFlags.map((flag) => (
                    <article key={flag.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{tr("Powod:", "Reason:")} {flag.reason}</p>
                      <p className="mt-1 text-sm text-slate-700">{tr("Szczegoly:", "Details:")} {flag.details || tr("Brak szczegolow", "No details")}</p>
                      <p className="mt-1 text-xs text-slate-600">{tr("Kiedy:", "When:")} {new Date(flag.createdAt).toLocaleString(locale === "en" ? "en-US" : "pl-PL")}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {tr("Przez kogo:", "Reported by:")} {flag.createdBy?.username || flag.createdBy?.email || tr("Nieznany", "Unknown")}
                      </p>
                      {flag.postReference?.postId ? (
                        <p className="mt-1 text-xs text-slate-700">
                          {tr("Powiazany post:", "Related post:")} 
                          <Link href={`/ogloszenia/${flag.postReference.postId}`} className="font-semibold text-amber-700 hover:text-amber-800">
                            {flag.postReference.postTitle || flag.postReference.postId}
                          </Link>
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onArchive(flag.id)}
                        className="mt-3 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                      >
                        {tr("Archiwizuj", "Archive")}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h4 className="text-sm font-bold uppercase tracking-[0.15em] text-amber-700">{tr("Zarchiwizowane zgloszenia", "Archived reports")}</h4>
              {state.archivedFlags.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{tr("Brak zarchiwizowanych zgloszen.", "No archived reports.")}</p>
              ) : (
                <div className="mt-2 space-y-3">
                  {state.archivedFlags.map((flag) => (
                    <article key={flag.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{tr("Powod:", "Reason:")} {flag.reason}</p>
                      <p className="mt-1 text-sm text-slate-700">{tr("Szczegoly:", "Details:")} {flag.details || tr("Brak szczegolow", "No details")}</p>
                      <p className="mt-1 text-xs text-slate-600">{tr("Kiedy:", "When:")} {new Date(flag.createdAt).toLocaleString(locale === "en" ? "en-US" : "pl-PL")}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {tr("Przez kogo:", "Reported by:")} {flag.createdBy?.username || flag.createdBy?.email || tr("Nieznany", "Unknown")}
                      </p>
                      {flag.postReference?.postId ? (
                        <p className="mt-1 text-xs text-slate-700">
                          {tr("Powiazany post:", "Related post:")} 
                          <Link href={`/ogloszenia/${flag.postReference.postId}`} className="font-semibold text-amber-700 hover:text-amber-800">
                            {flag.postReference.postTitle || flag.postReference.postId}
                          </Link>
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SiteSettingsTabsClient() {
  const { locale } = useLocale();
  const tr = useCallback<Translator>((pl, en) => (locale === "en" ? en : pl), [locale]);
  const [activeTab, setActiveTab] = useState("taxonomy");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [adminPosts, setAdminPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postActionLoading, setPostActionLoading] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ReportsModalState>({
    open: false,
    loading: false,
    error: null,
    user: null,
    openFlags: [],
    archivedFlags: [],
  });

  const userRows = useMemo(() => users, [users]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const response = await fetch(`/api/admin/users?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie pobrac listy uzytkownikow.", "Failed to fetch users list."));
      }

      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalUsers(data.pagination?.total || 0);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : tr("Nie udalo sie pobrac listy uzytkownikow.", "Failed to fetch users list."));
    } finally {
      setUsersLoading(false);
    }
  }, [page, pageSize, tr]);

  const loadAdminPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);

    try {
      const response = await fetch("/api/admin/posts", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie pobrac ogloszen.", "Failed to fetch listings."));
      }

      setAdminPosts(data.posts || []);
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : tr("Nie udalo sie pobrac ogloszen.", "Failed to fetch listings."));
    } finally {
      setPostsLoading(false);
    }
  }, [tr]);

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

  async function updatePostStatus(postId: string, action: string) {
    setPostActionLoading(`${postId}:${action}`);
    setPostsError(null);

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

      setAdminPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: data.post?.status ?? post.status,
                isPromoted: data.post?.is_promoted ?? data.post?.isPromoted ?? post.isPromoted,
                publishedAt: data.post?.published_at ?? data.post?.publishedAt ?? post.publishedAt,
                expiresAt: data.post?.expires_at ?? data.post?.expiresAt ?? post.expiresAt,
              }
            : post,
        ),
      );
    } catch (error) {
      setPostsError(
        error instanceof Error ? error.message : tr("Nie udalo sie zaktualizowac statusu.", "Failed to update status."),
      );
    } finally {
      setPostActionLoading(null);
    }
  }

  async function openReports(user: AdminUser) {
    setModalState({
      open: true,
      loading: true,
      error: null,
      user,
      openFlags: [],
      archivedFlags: [],
    });

    try {
      const response = await fetch(`/api/admin/users/${user.id}/flags`, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie pobrac zgloszen.", "Failed to fetch reports."));
      }

      setModalState({
        open: true,
        loading: false,
        error: null,
        user,
        openFlags: data.openFlags || [],
        archivedFlags: data.archivedFlags || [],
      });
    } catch (error) {
      setModalState({
        open: true,
        loading: false,
        error: error instanceof Error ? error.message : tr("Nie udalo sie pobrac zgloszen.", "Failed to fetch reports."),
        user,
        openFlags: [],
        archivedFlags: [],
      });
    }
  }

  async function archiveFlag(flagId: string) {
    try {
      const response = await fetch(`/api/admin/users/flags/${flagId}/archive`, {
        method: "PATCH",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie zarchiwizowac zgloszenia.", "Failed to archive report."));
      }

      setModalState((current) => {
        const target = current.openFlags.find((flag) => flag.id === flagId);

        if (!target) {
          return current;
        }

        const nextOpen = current.openFlags.filter((flag) => flag.id !== flagId);
        const nextArchived = [{ ...target, status: "ARCHIVED" }, ...current.archivedFlags];

        return {
          ...current,
          openFlags: nextOpen,
          archivedFlags: nextArchived,
        };
      });

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => {
          if (currentUser.id !== modalState.user?.id) {
            return currentUser;
          }

          const open = Math.max((currentUser.reports?.open || 0) - 1, 0);
          const archived = (currentUser.reports?.archived || 0) + 1;

          return {
            ...currentUser,
            reports: { open, archived },
          };
        }),
      );
    } catch (error) {
      setModalState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : tr("Nie udalo sie zarchiwizowac zgloszenia.", "Failed to archive report."),
      }));
    }
  }

  useEffect(() => {
    if (activeTab === "users") {
      void loadUsers();
    }

    if (activeTab === "listings") {
      void loadAdminPosts();
    }
  }, [activeTab, page, pageSize, loadUsers, loadAdminPosts]);

  return (
    <div className="space-y-4">
      <ReportsModal
        state={modalState}
        tr={tr}
        locale={locale}
        onClose={() =>
          setModalState((current) => ({
            ...current,
            open: false,
          }))
        }
        onArchive={archiveFlag}
      />

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab("taxonomy")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeTab === "taxonomy" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {tr("Kategorie i tagi", "Categories and tags")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeTab === "users" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {tr("Uzytkownicy", "Users")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("listings")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeTab === "listings" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {tr("Ogloszenia", "Listings")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reportCategories")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            activeTab === "reportCategories" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {tr("Kategorie zgloszen", "Report categories")}
        </button>
      </div>

      {activeTab === "taxonomy" ? <TaxonomyImportClient /> : null}
      {activeTab === "reportCategories" ? <ModerationFlagCategoriesImportClient /> : null}

      {activeTab === "users" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">{tr("Uzytkownicy", "Users")}</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {tr("Na strone", "Per page")}
              </label>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {tr("Odswiez", "Refresh")}
              </button>
            </div>
          </div>

          {usersLoading ? <p className="text-sm text-slate-600">{tr("Ladowanie uzytkownikow...", "Loading users...")}</p> : null}
          {usersError ? <p className="text-sm font-semibold text-rose-700">{usersError}</p> : null}

          {!usersLoading && !usersError ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-2 py-2">{tr("Profil", "Profile")}</th>
                    <th className="px-2 py-2">{tr("Login", "Username")}</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">{tr("Aktywny", "Active")}</th>
                    <th className="px-2 py-2">{tr("Zgloszenia", "Reports")}</th>
                    <th className="px-2 py-2">{tr("Akcje", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((rowUser) => {
                    const isCompanyAccount = rowUser.accountType === "COMPANY";
                    const hasOpen = (rowUser.reports?.open || 0) > 0;
                    const hasArchived = (rowUser.reports?.archived || 0) > 0;
                    const dotColor = hasOpen ? "bg-red-500" : hasArchived ? "bg-amber-500" : "bg-slate-300";
                    const dotTitle = hasOpen
                      ? `${tr("Otwarte zgloszenia:", "Open reports:")} ${rowUser.reports.open}`
                      : hasArchived
                        ? `${tr("Wczesniejsze zgloszenia:", "Previous reports:")} ${rowUser.reports.archived}`
                        : tr("Brak zgloszen", "No reports");

                    return (
                      <tr key={rowUser.id} className={`border-b border-slate-100 ${isCompanyAccount ? "bg-amber-50/20" : ""}`}>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 ">
                            <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                              {rowUser.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={rowUser.avatarUrl} alt={rowUser.username || rowUser.email} className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className={`px-2 py-2 font-semibold  ${isCompanyAccount ? "text-red-600" : "text-slate-900"}`}>
                          <Link href={`/u/${rowUser.id}`} className="hover:text-amber-700">
                            {rowUser.username || tr("(brak)", "(none)")}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-slate-700">{rowUser.email}</td>
                        <td className="px-2 py-2">
                          {rowUser.isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                              {tr("Tak", "Yes")}
                            </span>
                          ) : (
                            <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                              {tr("Ostatnio widziany", "Last seen")}: {rowUser.lastSeenAt ? new Date(rowUser.lastSeenAt).toLocaleString(locale === "en" ? "en-US" : "pl-PL") : "--"}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <StatusDotButton
                            colorClass={dotColor}
                            title={dotTitle}
                            disabled={!hasOpen && !hasArchived}
                            onClick={() => void openReports(rowUser)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700"
                              title={tr("W przygotowaniu", "Coming soon")}
                            >
                              {tr("Zbanuj", "Ban")}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                              title={tr("W przygotowaniu", "Coming soon")}
                            >
                              {tr("Usun", "Delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {!usersLoading && !usersError ? (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <p className="text-xs text-slate-600">
                {tr("Liczba uzytkownikow", "Total users")}: {totalUsers}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tr("Poprzednia", "Previous")}
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  {tr("Strona", "Page")} {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {tr("Nastepna", "Next")}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === "listings" ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">{tr("Monitoring ogloszen", "Listings monitoring")}</h2>
            <button
              type="button"
              onClick={() => void loadAdminPosts()}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {tr("Odswiez", "Refresh")}
            </button>
          </div>

          {postsLoading ? <p className="text-sm text-slate-600">{tr("Ladowanie ogloszen...", "Loading listings...")}</p> : null}
          {postsError ? <p className="text-sm font-semibold text-rose-700">{postsError}</p> : null}

          {!postsLoading && !postsError ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-2 py-2">{tr("Tytul", "Title")}</th>
                    <th className="px-2 py-2">{tr("Autor", "Author")}</th>
                    <th className="px-2 py-2">{tr("Status", "Status")}</th>
                    <th className="px-2 py-2">{tr("Miasto", "City")}</th>
                    <th className="px-2 py-2">{tr("Flagi posta", "Post flags")}</th>
                    <th className="px-2 py-2">{tr("Flagi autora", "Author flags")}</th>
                    <th className="px-2 py-2">{tr("Akcje", "Actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminPosts.map((adminPost) => (
                    <tr key={adminPost.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-900">
                        <Link href={`/ogloszenia/${adminPost.id}`} className="hover:text-amber-700">
                          {adminPost.title}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-slate-700">
                        <Link href={`/u/${adminPost.author.id}`} className="hover:text-amber-700">
                          {adminPost.author.username || adminPost.author.email}
                        </Link>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusPillClass(adminPost.status)}`}>
                          {statusLabel(adminPost.status)}
                        </span>
                        {adminPost.isPromoted ? (
                          <span className="ml-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                            {tr("Promoted", "Promoted")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-slate-700">{adminPost.city || "-"}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${adminPost.postOpenFlags > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                          {adminPost.postOpenFlags}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${adminPost.authorOpenFlags > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {adminPost.authorOpenFlags}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/ogloszenia/${adminPost.id}/edytuj`}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {tr("Edytuj", "Edit")}
                          </Link>

                          {adminPost.status === "DRAFT" || adminPost.status === "REVIEWED" ? (
                            <button
                              type="button"
                              onClick={() => void updatePostStatus(adminPost.id, "REVIEW_POST")}
                              disabled={postActionLoading === `${adminPost.id}:REVIEW_POST`}
                              className="rounded-md border border-blue-300 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                            >
                              {tr("Review post", "Review post")}
                            </button>
                          ) : null}

                          {adminPost.status === "IN_REVIEW" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void updatePostStatus(adminPost.id, "REVIEWED")}
                                disabled={postActionLoading === `${adminPost.id}:REVIEWED`}
                                className="rounded-md border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                              >
                                {tr("Reviewed", "Reviewed")}
                              </button>
                              <button
                                type="button"
                                onClick={() => void updatePostStatus(adminPost.id, "REVIEWED_PUBLISHED")}
                                disabled={postActionLoading === `${adminPost.id}:REVIEWED_PUBLISHED`}
                                className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                              >
                                {tr("Reviewed & Published", "Reviewed & Published")}
                              </button>
                            </>
                          ) : null}

                          {adminPost.status === "REVIEWED" ? (
                            <button
                              type="button"
                              onClick={() => void updatePostStatus(adminPost.id, "PUBLISH")}
                              disabled={postActionLoading === `${adminPost.id}:PUBLISH`}
                              className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              {tr("Publish", "Publish")}
                            </button>
                          ) : null}

                          {adminPost.status !== "EXPIRED" ? (
                            <button
                              type="button"
                              onClick={() => void updatePostStatus(adminPost.id, "MARK_EXPIRED")}
                              disabled={postActionLoading === `${adminPost.id}:MARK_EXPIRED`}
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              {tr("Expire", "Expire")}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => void updatePostStatus(adminPost.id, adminPost.isPromoted ? "UNPROMOTE" : "PROMOTE")}
                            disabled={postActionLoading === `${adminPost.id}:${adminPost.isPromoted ? "UNPROMOTE" : "PROMOTE"}`}
                            className="rounded-md border border-violet-300 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                          >
                            {adminPost.isPromoted ? tr("Unpromote", "Unpromote") : tr("Promote", "Promote")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
