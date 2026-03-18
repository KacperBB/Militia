import { randomUUID } from "node:crypto";

import type { ModerationFlagCategoryImportDraft } from "@/lib/moderation/types";

const MAX_AGE_MS = 30 * 60 * 1000;
const drafts = new Map<string, ModerationFlagCategoryImportDraft>();

function cleanup() {
  const now = Date.now();

  for (const [id, draft] of drafts.entries()) {
    if (now - draft.createdAt > MAX_AGE_MS) {
      drafts.delete(id);
    }
  }
}

export function createModerationFlagCategoryDraft(
  input: Omit<ModerationFlagCategoryImportDraft, "id" | "createdAt">,
) {
  cleanup();

  const id = randomUUID();
  const draft = {
    id,
    createdAt: Date.now(),
    ...input,
  };

  drafts.set(id, draft);
  return draft;
}

export function getModerationFlagCategoryDraft(id: string) {
  cleanup();
  return drafts.get(id) ?? null;
}

export function deleteModerationFlagCategoryDraft(id: string) {
  drafts.delete(id);
}
