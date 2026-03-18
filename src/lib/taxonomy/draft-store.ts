import { randomUUID } from "node:crypto";

import type { TaxonomyImportDraft } from "@/lib/taxonomy/types";

const MAX_AGE_MS = 30 * 60 * 1000;
const drafts = new Map<string, TaxonomyImportDraft>();

function cleanup() {
  const now = Date.now();

  for (const [id, draft] of drafts.entries()) {
    if (now - draft.createdAt > MAX_AGE_MS) {
      drafts.delete(id);
    }
  }
}

export function createTaxonomyDraft(input: Omit<TaxonomyImportDraft, "id" | "createdAt">) {
  cleanup();

  const id = randomUUID();
  const draft: TaxonomyImportDraft = {
    id,
    createdAt: Date.now(),
    ...input,
  };

  drafts.set(id, draft);
  return draft;
}

export function getTaxonomyDraft(id: string) {
  cleanup();
  return drafts.get(id) ?? null;
}

export function deleteTaxonomyDraft(id: string) {
  drafts.delete(id);
}
