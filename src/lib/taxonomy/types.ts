export type ParsedTag = {
  slug: string;
  name: string;
};

export type ParsedCategory = {
  slug: string;
  name: string;
  parentSlug: string | null;
  tags: ParsedTag[];
};

export type TaxonomyImportDraft = {
  id: string;
  createdByUserId: string;
  createdAt: number;
  categories: ParsedCategory[];
  tagsCount: number;
};

export type TaxonomyTreeNode = {
  slug: string;
  name: string;
  tags: ParsedTag[];
  children: TaxonomyTreeNode[];
};
