"use client";

import { useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";

type TranslateFn = (pl: string, en: string) => string;

type ImportModalState = {
  open: boolean;
  status: "idle" | "loading" | "success" | "error";
  title: string;
  message: string;
  errorDetail: string;
};

type ModerationPreviewNode = {
  slug: string;
  name: string;
  children: ModerationPreviewNode[];
};

type ModerationPreviewResponse = {
  draftId: string;
  summary: {
    categoriesCount: number;
  };
  tree: ModerationPreviewNode[];
};

function ImportStatusModal({ state, onClose, tr }: { state: ImportModalState; onClose: () => void; tr: TranslateFn }) {
  if (!state.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{state.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{state.message}</p>
          </div>
          {state.status !== "loading" ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {tr("Zamknij", "Close")}
            </button>
          ) : null}
        </div>

        {state.status === "loading" ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-slate-900" />
          </div>
        ) : null}

        {state.status === "error" ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{state.errorDetail}</div>
        ) : null}
      </div>
    </div>
  );
}

function TreeNode({ node }: { node: ModerationPreviewNode }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="font-semibold text-slate-900">{node.name}</div>
      <div className="text-xs text-slate-500">/{node.slug}</div>
      {node.children.length > 0 ? (
        <ul className="mt-3 space-y-2 border-l border-slate-200 pl-3">
          {node.children.map((child: ModerationPreviewNode) => (
            <TreeNode key={child.slug} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ModerationFlagCategoriesImportClient() {
  const { locale } = useLocale();
  const tr: TranslateFn = (pl, en) => (locale === "en" ? en : pl);
  const [xml, setXml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<ModerationPreviewResponse | null>(null);
  const [modalState, setModalState] = useState<ImportModalState>({
    open: false,
    status: "idle",
    title: "",
    message: "",
    errorDetail: "",
  });

  const canPreview = useMemo(() => xml.trim().length > 0 && !isLoading, [xml, isLoading]);
  const canCommit = useMemo(() => Boolean(preview?.draftId) && !isCommitting, [preview?.draftId, isCommitting]);

  async function onLoadSample() {
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/mock/moderation-flag-categories-sample.xml", { cache: "no-store" });
      setXml(await response.text());
    } catch {
      setError(tr("Nie udalo sie wczytac przykladowego XML.", "Unable to load sample XML."));
    }
  }

  async function onPreview() {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setPreview(null);

    try {
      const response = await fetch("/api/admin/moderation-flag-categories/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml }),
      });
      const data = (await response.json()) as ModerationPreviewResponse & { message?: string };

      if (!response.ok) {
        throw new Error(data?.message || tr("Podglad nie powiodl sie.", "Preview failed."));
      }

      setPreview(data);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : tr("Podglad nie powiodl sie.", "Preview failed."));
    } finally {
      setIsLoading(false);
    }
  }

  async function onCommit() {
    if (!preview?.draftId) {
      return;
    }

    setIsCommitting(true);
    setError(null);
    setSuccess(null);
    setModalState({
      open: true,
      status: "loading",
      title: tr("Import kategorii zgloszen w toku", "Importing report categories"),
      message: tr("Trwa zapisywanie kategorii zgloszen do bazy.", "Saving report categories to the database."),
      errorDetail: "",
    });

    try {
      const response = await fetch("/api/admin/moderation-flag-categories/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: preview.draftId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Import nie powiodl sie.", "Import failed."));
      }

      setSuccess(data.message || tr("Import zakonczony.", "Import completed."));
      setPreview(null);
      setModalState({
        open: true,
        status: "success",
        title: tr("Import zakonczony", "Import completed"),
        message: data.message || tr("Kategorie zgloszen zostaly zapisane poprawnie.", "Report categories saved successfully."),
        errorDetail: "",
      });
    } catch (commitError) {
      const message = commitError instanceof Error ? commitError.message : tr("Import nie powiodl sie.", "Import failed.");
      setError(message);
      setModalState({
        open: true,
        status: "error",
        title: tr("Import nieudany", "Import failed"),
        message: tr("Kategorie zgloszen nie zostaly zapisane.", "Report categories were not saved."),
        errorDetail: message,
      });
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <ImportStatusModal
        state={modalState}
        tr={tr}
        onClose={() => setModalState((current) => ({ ...current, open: false }))}
      />

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h1 className="text-xl font-bold text-slate-900">{tr("Import kategorii zgloszen XML", "Report categories XML import")}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {tr(
            "Wklej XML z glownymi kategoriami i podkategoriami zgloszen. Najpierw zobacz podglad, potem zapisz do bazy.",
            "Paste XML with root report categories and subcategories. Preview first, then save to database.",
          )}
        </p>
      </section>

      <section className="space-y-3">
        <div className="flex gap-2">
          <button type="button" onClick={onLoadSample} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            {tr("Wczytaj przykladowy XML", "Load sample XML")}
          </button>
          <button type="button" onClick={onPreview} disabled={!canPreview} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
            {isLoading ? tr("Parsowanie...", "Parsing...") : tr("Podglad", "Preview")}
          </button>
        </div>

        <textarea value={xml} onChange={(event) => setXml(event.target.value)} rows={14} placeholder="<moderationCategories>...</moderationCategories>" className="w-full rounded-lg border border-slate-300 p-3 font-mono text-sm" />

        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}
      </section>

      {preview ? (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{tr("Liczba kategorii:", "Categories count:")}</span> {preview.summary.categoriesCount}
            </div>
            <button type="button" onClick={onCommit} disabled={!canCommit} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isCommitting ? tr("Zapisywanie...", "Saving...") : tr("Zatwierdz i importuj", "Approve and import")}
            </button>
          </div>

          <ul className="space-y-2">
            {preview.tree.map((node: ModerationPreviewNode) => (
              <TreeNode key={node.slug} node={node} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
