import { XMLParser } from "fast-xml-parser";

import type {
  ModerationFlagCategoryTreeNode,
  ParsedModerationFlagCategory,
} from "@/lib/moderation/types";

type XmlCategory = {
  "@_slug"?: string;
  "@_name"?: string;
  "@_parentSlug"?: string;
  category?: XmlCategory | XmlCategory[];
  categories?: {
    category?: XmlCategory | XmlCategory[];
  };
};

type XmlPayload = {
  moderationCategories?: {
    category?: XmlCategory | XmlCategory[];
    categories?: {
      category?: XmlCategory | XmlCategory[];
    };
  };
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeSlug(input: string) {
  return input.trim().toLowerCase();
}

function normalizeName(input: string) {
  return input.trim();
}

function collectChildren(item: XmlCategory) {
  return [...toArray(item.category), ...toArray(item.categories?.category)];
}

function flatten(items: XmlCategory[], parentSlug: string | null, target: ParsedModerationFlagCategory[]) {
  for (const item of items) {
    const slugRaw = item["@_slug"] ?? "";
    const nameRaw = item["@_name"] ?? "";

    if (!slugRaw || !nameRaw) {
      throw new Error("Each <category> must contain slug and name attributes.");
    }

    const slug = normalizeSlug(slugRaw);
    const explicitParent = item["@_parentSlug"] ? normalizeSlug(item["@_parentSlug"]) : null;

    if (explicitParent && parentSlug && explicitParent !== parentSlug) {
      throw new Error(`Category ${slug} has inconsistent parentSlug (${explicitParent}) for nested parent (${parentSlug}).`);
    }

    const resolvedParentSlug = explicitParent ?? parentSlug;

    target.push({
      slug,
      name: normalizeName(nameRaw),
      parentSlug: resolvedParentSlug,
    });

    const children = collectChildren(item);
    if (children.length > 0) {
      flatten(children, slug, target);
    }
  }
}

export function parseModerationFlagCategoriesXml(xml: string): ParsedModerationFlagCategory[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml) as XmlPayload;
  const items = [...toArray(parsed.moderationCategories?.category), ...toArray(parsed.moderationCategories?.categories?.category)];

  if (!items.length) {
    throw new Error("XML does not contain any <category> nodes.");
  }

  const categories: ParsedModerationFlagCategory[] = [];
  flatten(items, null, categories);

  const slugs = new Set();
  for (const category of categories) {
    if (slugs.has(category.slug)) {
      throw new Error(`Duplicate category slug detected: ${category.slug}`);
    }

    slugs.add(category.slug);
  }

  for (const category of categories) {
    if (category.parentSlug && !slugs.has(category.parentSlug)) {
      throw new Error(`Category ${category.slug} references unknown parent ${category.parentSlug}`);
    }
  }

  return categories;
}

export function buildModerationFlagCategoryTree(
  categories: ParsedModerationFlagCategory[],
): ModerationFlagCategoryTreeNode[] {
  const bySlug = new Map<string, ModerationFlagCategoryTreeNode>();

  for (const category of categories) {
    bySlug.set(category.slug, {
      slug: category.slug,
      name: category.name,
      children: [],
    });
  }

  const roots: ModerationFlagCategoryTreeNode[] = [];

  for (const category of categories) {
    const node = bySlug.get(category.slug);

    if (!node) {
      continue;
    }

    if (!category.parentSlug) {
      roots.push(node);
      continue;
    }

    const parent = bySlug.get(category.parentSlug);
    if (!parent) {
      roots.push(node);
      continue;
    }

    parent.children.push(node);
  }

  return roots;
}
