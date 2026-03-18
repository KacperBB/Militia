export type ParsedModerationFlagCategory = {
  slug: string;
  name: string;
  parentSlug: string | null;
};

export type ModerationFlagCategoryImportDraft = {
  id: string;
  createdByUserId: string;
  createdAt: number;
  categories: ParsedModerationFlagCategory[];
};

export type ModerationFlagCategoryTreeNode = {
  slug: string;
  name: string;
  children: ModerationFlagCategoryTreeNode[];
};
