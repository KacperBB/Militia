export type ParsedTag = {
  slug: string;
  name: string;
};

export type ParsedAttributeOption = {
  value: string;
  label: string;
  sortOrder: number;
};

export type ParsedAttribute = {
  slug: string;
  name: string;
  type: "text" | "number" | "boolean" | "date" | "select" | "multiselect";
  isRequired: boolean;
  sortOrder: number;
  options: ParsedAttributeOption[];
  metadata: Record<string, string>;
};

export type ParsedCategory = {
  slug: string;
  name: string;
  parentSlug: string | null;
  tags: ParsedTag[];
  attributes: ParsedAttribute[];
};

export type TaxonomyImportDraft = {
  id: string;
  createdByUserId: string;
  createdAt: number;
  categories: ParsedCategory[];
  tagsCount: number;
  attributesCount: number;
  attributeOptionsCount: number;
};

export type TaxonomyTreeNode = {
  slug: string;
  name: string;
  tags: ParsedTag[];
  attributes: ParsedAttribute[];
  children: TaxonomyTreeNode[];
};
