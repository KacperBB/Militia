"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";

type ReportCategoryNode = {
  id: string;
  slug: string;
  name: string;
  children: ReportCategoryNode[];
};

type WizardStep = 1 | 2 | 3 | 4;

type ReportFlagWizardTriggerProps = {
  targetType: "POST" | "USER";
  targetId: string;
  submitUrl?: string;
  categoriesTargetType?: "POST" | "USER";
  triggerLabel?: string;
  modalTitle?: string;
};

const ROLLBACK_DELAY_MS = 1000;
const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FALLBACK_REPORT_CATEGORIES: ReportCategoryNode[] = [
  {
    id: "fallback-spam",
    slug: "spam",
    name: "Spam / reklama",
    children: [],
  },
  {
    id: "fallback-fraud",
    slug: "fraud",
    name: "Oszustwo / scam",
    children: [],
  },
  {
    id: "fallback-illegal",
    slug: "illegal",
    name: "Nielegalna tresc",
    children: [],
  },
  {
    id: "fallback-misleading",
    slug: "misleading",
    name: "Wprowadzajace w blad",
    children: [],
  },
  {
    id: "fallback-violence",
    slug: "violence",
    name: "Namawianie do przemocy",
    children: [
      {
        id: "fallback-violence-children",
        slug: "violence-children",
        name: "Przemoc wobec dzieci",
        children: [],
      },
      {
        id: "fallback-violence-animals",
        slug: "violence-animals",
        name: "Przemoc wobec zwierzat",
        children: [],
      },
    ],
  },
];

export function ReportFlagWizardTrigger({
  targetType,
  targetId,
  submitUrl,
  categoriesTargetType,
  triggerLabel,
  modalTitle,
}: ReportFlagWizardTriggerProps) {
  const { locale } = useLocale();
  const tr = useCallback((pl: string, en: string) => (locale === "en" ? en : pl), [locale]);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [categories, setCategories] = useState<ReportCategoryNode[]>([]);
  const [usingFallbackCategories, setUsingFallbackCategories] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [details, setDetails] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<"idle" | "success" | "error">("idle");
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);
  const rollbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const subcategories = selectedCategory?.children ?? [];
  const hasSubcategories = subcategories.length > 0;
  const totalFormSteps = hasSubcategories ? 3 : 2;
  const visualStep = step === 4 ? totalFormSteps : hasSubcategories ? Math.min(step, 3) : step === 3 ? 2 : 1;
  const hasValidSelection = UUID_LIKE_RE.test(categoryId) && (!subcategoryId || UUID_LIKE_RE.test(subcategoryId));
  const resolvedCategoriesTargetType = categoriesTargetType ?? (targetType === "POST" ? "POST" : "USER");
  const resolvedSubmitUrl = submitUrl ?? "/api/moderation/flags";
  const resolvedTriggerLabel = triggerLabel ?? (targetType === "POST" ? tr("Zglos ogloszenie", "Report listing") : tr("Zglos uzytkownika", "Report user"));
  const resolvedModalTitle = modalTitle ?? (targetType === "POST" ? tr("Zgloszenie ogloszenia", "Listing report") : tr("Zgloszenie uzytkownika", "User report"));

  useEffect(() => {
    return () => {
      if (rollbackTimerRef.current) {
        clearTimeout(rollbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (step === 2 && !hasSubcategories) {
      setStep(3);
    }
  }, [open, step, hasSubcategories]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setStepError(null);
      setUsingFallbackCategories(false);

      try {
        const response = await fetch(`/api/moderation/flag-categories?targetType=${resolvedCategoriesTargetType}`, {
          cache: "no-store",
        });

        let data: { categories?: ReportCategoryNode[]; message?: string } | null = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(data?.message || tr("Nie udalo sie pobrac kategorii.", "Failed to fetch categories."));
        }

        const loaded = data?.categories || [];
        let finalCategories: ReportCategoryNode[] = loaded;

        if (resolvedCategoriesTargetType === "USER" && loaded.length === 0) {
          const fallbackResponse = await fetch("/api/moderation/flag-categories?targetType=POST", {
            cache: "no-store",
          });
          const fallbackData = await fallbackResponse.json();

          if (fallbackResponse.ok && Array.isArray(fallbackData.categories)) {
            finalCategories = fallbackData.categories;
          }
        }

        if (active) {
          const fallbackMode = finalCategories.length === 0;
          setCategories(fallbackMode ? FALLBACK_REPORT_CATEGORIES : finalCategories);
          setUsingFallbackCategories(fallbackMode);
        }
      } catch (error) {
        if (active) {
          const hasExistingRealCategories = categories.length > 0 && !categories.every((category) => category.id.startsWith("fallback-"));

          if (!hasExistingRealCategories) {
            setCategories(FALLBACK_REPORT_CATEGORIES);
            setUsingFallbackCategories(true);
          }

          setStepError(error instanceof Error ? error.message : tr("Nie udalo sie pobrac kategorii.", "Failed to fetch categories."));
        }
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
  }, [open, resolvedCategoriesTargetType, tr]);

  function openModal() {
    setOpen(true);
    setStep(1);
    setCategories([]);
    setUsingFallbackCategories(false);
    setCategoryId("");
    setSubcategoryId("");
    setDetails("");
    setStepError(null);
    setSummaryStatus("idle");
    setSummaryMessage(null);
  }

  function closeModal() {
    setOpen(false);
    setStepError(null);
    if (rollbackTimerRef.current) {
      clearTimeout(rollbackTimerRef.current);
      rollbackTimerRef.current = null;
    }
  }

  async function onSubmit() {
    setSubmitLoading(true);
    setStepError(null);

    if (!categoryId || !UUID_LIKE_RE.test(categoryId) || (subcategoryId && !UUID_LIKE_RE.test(subcategoryId))) {
      const message = tr(
        "Wybrana kategoria jest nieprawidlowa. Odswiez formularz i sprobuj ponownie.",
        "Selected category is invalid. Refresh the form and try again.",
      );

      setSummaryStatus("error");
      setSummaryMessage(message);
      setStep(4);

      rollbackTimerRef.current = setTimeout(() => {
        setStep(3);
        setStepError(message);
      }, ROLLBACK_DELAY_MS);

      setSubmitLoading(false);
      return;
    }

    if (usingFallbackCategories) {
      const message = tr(
        "Kategorie zgloszen nie zostaly jeszcze zaimportowane przez administratora.",
        "Report categories are not imported yet by an administrator.",
      );

      setSummaryStatus("error");
      setSummaryMessage(message);
      setStep(4);

      rollbackTimerRef.current = setTimeout(() => {
        setStep(3);
        setStepError(message);
      }, ROLLBACK_DELAY_MS);

      setSubmitLoading(false);
      return;
    }

    const selectedCategoryName = selectedCategory?.name ?? "";
    const selectedSubcategoryName = subcategories.find((item) => item.id === subcategoryId)?.name ?? "";
    const reason = selectedSubcategoryName ? `${selectedCategoryName} / ${selectedSubcategoryName}` : selectedCategoryName;

    try {
      const body = targetType === "POST"
        ? {
            categoryId,
            subcategoryId: subcategoryId || undefined,
            details: details.trim() || undefined,
          }
        : {
            targetType,
            targetId,
            categoryId,
            subcategoryId: subcategoryId || undefined,
            reason,
            details: details.trim() || undefined,
          };

      const response = await fetch(resolvedSubmitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || tr("Nie udalo sie wyslac zgloszenia.", "Failed to submit report."));
      }

      setSummaryStatus("success");
      setSummaryMessage(tr("Zgloszenie zostalo zlozone poprawnie.", "Report submitted successfully."));
      setStep(4);
    } catch (error) {
      const message = error instanceof Error ? error.message : tr("Wystapil blad podczas wysylki zgloszenia.", "An error occurred while submitting the report.");
      setSummaryStatus("error");
      setSummaryMessage(message);
      setStep(4);

      rollbackTimerRef.current = setTimeout(() => {
        setStep(3);
        setStepError(message);
      }, ROLLBACK_DELAY_MS);
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center justify-center rounded-full border border-rose-300 bg-white p-2 text-rose-700 transition hover:bg-rose-50"
        title={resolvedTriggerLabel}
        aria-label={resolvedTriggerLabel}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M4.75 3A1.75 1.75 0 0 0 3 4.75v10.5A1.75 1.75 0 0 0 4.75 17h10.5A1.75 1.75 0 0 0 17 15.25V8.06a1.75 1.75 0 0 0-.513-1.237l-3.31-3.31A1.75 1.75 0 0 0 11.94 3H4.75Zm4.5 4a.75.75 0 0 1 1.5 0v3.25a.75.75 0 0 1-1.5 0V7Zm.75 6.25a.875.875 0 1 0 0-1.75.875.875 0 0 0 0 1.75Z" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-950/55 p-4"
          style={{ zIndex: 2000 }}
          onClick={closeModal}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">{resolvedModalTitle}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {tr("Zamknij", "Close")}
              </button>
            </div>

            <div className="mb-4 flex items-center gap-2">
              {Array.from({ length: totalFormSteps }, (_, index) => index + 1).map((value) => (
                <div
                  key={value}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${visualStep >= value ? "bg-rose-600" : "bg-slate-200"}`}
                />
              ))}
            </div>

            <div className="relative min-h-72 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <section
                className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 ${step === 1 ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 pointer-events-none"}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">{tr("Etap 1", "Step 1")}</h3>
                <p className="mt-2 text-sm text-slate-700">{tr("Wybierz kategorie zgloszenia.", "Select report category.")}</p>

                <div className="mt-4 space-y-2 pb-20">
                  {categoriesLoading ? <p className="text-sm text-slate-500">{tr("Ladowanie kategorii...", "Loading categories...")}</p> : null}
                  {!categoriesLoading && categories.length === 0 ? (
                    <p className="text-sm text-rose-700">{tr("Brak dostepnych kategorii.", "No categories available.")}</p>
                  ) : null}
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(category.id);
                        setSubcategoryId("");
                        setStepError(null);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${categoryId === category.id ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700 hover:border-rose-300"}`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                <div className="sticky bottom-0 mt-4 flex justify-end border-t border-slate-200 bg-slate-50/95 pt-3 backdrop-blur">
                  <button
                    type="button"
                    disabled={!categoryId}
                    onClick={() => setStep(hasSubcategories ? 2 : 3)}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tr("Dalej", "Next")}
                  </button>
                </div>
              </section>

              <section
                className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 ${step === 2 ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 pointer-events-none"}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">{tr("Etap 2", "Step 2")}</h3>
                <p className="mt-2 text-sm text-slate-700">{tr("Wybierz podkategorie zgloszenia.", "Select report subcategory.")}</p>

                <div className="mt-4 space-y-2 pb-20">
                  <button
                    type="button"
                    onClick={() => setSubcategoryId("")}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${subcategoryId === "" ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700 hover:border-rose-300"}`}
                  >
                    {tr("Brak podkategorii", "No subcategory")}
                  </button>

                  {subcategories.map((subcategory) => (
                    <button
                      key={subcategory.id}
                      type="button"
                      onClick={() => setSubcategoryId(subcategory.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${subcategoryId === subcategory.id ? "border-rose-400 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700 hover:border-rose-300"}`}
                    >
                      {subcategory.name}
                    </button>
                  ))}
                </div>

                <div className="sticky bottom-0 mt-4 flex justify-between border-t border-slate-200 bg-slate-50/95 pt-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {tr("Wstecz", "Back")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    {tr("Dalej", "Next")}
                  </button>
                </div>
              </section>

              <section
                className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 ${step === 3 ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 pointer-events-none"}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">{hasSubcategories ? tr("Etap 3", "Step 3") : tr("Etap 2", "Step 2")}</h3>
                <p className="mt-2 text-sm text-slate-700">{tr("Opisz zdarzenie i dodaj dodatkowe informacje.", "Describe the incident and add additional details.")}</p>

                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  maxLength={1500}
                  className="mt-4 min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  placeholder={tr("Opis zdarzenia, powod zgloszenia, dodatkowe informacje...", "Incident description, reason for report, additional details...")}
                />

                {stepError ? <p className="mt-3 text-sm font-semibold text-rose-700">{stepError}</p> : null}

                <div className="sticky bottom-0 mt-4 flex justify-between border-t border-slate-200 bg-slate-50/95 pt-3 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setStep(hasSubcategories ? 2 : 1)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    {tr("Wstecz", "Back")}
                  </button>
                  <button
                    type="button"
                    disabled={submitLoading || !categoryId || !hasValidSelection || categoriesLoading || usingFallbackCategories}
                    onClick={() => void onSubmit()}
                    className="rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitLoading ? tr("Wysylanie...", "Submitting...") : tr("Zloz zgloszenie", "Submit report")}
                  </button>
                </div>
              </section>

              <section
                className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 ${step === 4 ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 pointer-events-none"}`}
              >
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-600">{tr("Potwierdzenie", "Confirmation")}</h3>

                <div className={`mt-4 rounded-xl border p-4 text-sm ${summaryStatus === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                  {summaryMessage || (summaryStatus === "success" ? tr("Zgloszenie zostalo przyjete.", "Report accepted.") : tr("Wystapil blad.", "An error occurred."))}
                </div>

                {summaryStatus === "success" ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                    >
                      {tr("Zamknij", "Close")}
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-600">{tr("Powrot do formularza za chwile...", "Returning to form in a moment...")}</p>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}