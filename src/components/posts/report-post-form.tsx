"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";

type ReportCategoryNode = {
  id: string;
  slug: string;
  name: string;
  children: ReportCategoryNode[];
};

type ReportPostFormProps = {
  postId: string;
};

export function ReportPostForm({ postId }: ReportPostFormProps) {
  const { locale } = useLocale();
  const tr = useCallback((pl: string, en: string) => (locale === "en" ? en : pl), [locale]);
  const [categories, setCategories] = useState<ReportCategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [details, setDetails] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  useEffect(() => {
    if (!open || categories.length > 0) {
      return;
    }

    let active = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/moderation/flag-categories?targetType=POST", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || tr("Nie udalo sie pobrac kategorii zgloszen.", "Failed to fetch report categories."));
        }

        if (!active) {
          return;
        }

        setCategories(data.categories || []);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : tr("Nie udalo sie pobrac kategorii zgloszen.", "Failed to fetch report categories."));
      } finally {
        if (active) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      active = false;
    };
  }, [open, categories.length, tr]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/posts/${postId}/flags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId,
          subcategoryId: subcategoryId || undefined,
          details: details.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie wyslac zgloszenia.", "Failed to submit report."));
      }

      setMessage(tr("Zgloszenie zostalo wyslane do moderacji.", "Report has been submitted."));
      setCategoryId("");
      setSubcategoryId("");
      setDetails("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : tr("Blad wysylki zgloszenia.", "Report submission error."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-rose-800">{tr("Moderacja", "Moderation")}</h2>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700"
        >
          {open ? tr("Ukryj", "Hide") : tr("Zglos post", "Report post")}
        </button>
      </div>

      {open ? (
        <form onSubmit={onSubmit} className="mt-3 space-y-2">
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setSubcategoryId("");
            }}
            required
            className="w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm"
            disabled={categoriesLoading}
          >
            <option value="">{tr("Wybierz kategorie zgloszenia", "Choose report category")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {selectedCategory?.children?.length ? (
            <select
              value={subcategoryId}
              onChange={(event) => setSubcategoryId(event.target.value)}
              className="w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">{tr("Bez podkategorii", "No subcategory")}</option>
              {selectedCategory.children.map((subcategory: ReportCategoryNode) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          ) : null}
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={1500}
            className="min-h-24 w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm"
            placeholder={tr("Dodatkowe szczegoly", "Additional details")}
          />
          {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
          {message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : null}
          <button
            type="submit"
            disabled={submitting || !categoryId}
            className="rounded-md bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? tr("Wysylanie...", "Submitting...") : tr("Wyslij zgloszenie", "Submit report")}
          </button>
        </form>
      ) : null}
    </section>
  );
}
