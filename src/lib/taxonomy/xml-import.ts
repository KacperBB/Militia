import { XMLParser } from "fast-xml-parser";

import type { ParsedCategory, ParsedTag, TaxonomyTreeNode } from "@/lib/taxonomy/types";

type XmlTag = {
  "@_slug"?: string;
  "@_name"?: string;
};

type XmlCategory = {
  "@_slug"?: string;
  "@_name"?: string;
  "@_parentSlug"?: string;
  tag?: XmlTag | XmlTag[];
  category?: XmlCategory | XmlCategory[];
  categories?: {
    category?: XmlCategory | XmlCategory[];
  };
};

type XmlPayload = {
  taxonomy?: {
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

function collectChildCategories(item: XmlCategory): XmlCategory[] {
  return [...toArray(item.category), ...toArray(item.categories?.category)];
}

function flattenCategories(items: XmlCategory[], parentSlug: string | null, target: ParsedCategory[]) {
  for (const item of items) {
    const slugRaw = item["@_slug"] ?? "";
    const nameRaw = item["@_name"] ?? "";

    if (!slugRaw || !nameRaw) {
      throw new Error("Each <category> must contain slug and name attributes.");
    }

    const normalizedSlug = normalizeSlug(slugRaw);
    const explicitParent = item["@_parentSlug"] ? normalizeSlug(item["@_parentSlug"]) : null;

    if (explicitParent && parentSlug && explicitParent !== parentSlug) {
      throw new Error(
        `Category ${normalizedSlug} has inconsistent parentSlug (${explicitParent}) for nested parent (${parentSlug}).`,
      );
    }

    const resolvedParentSlug = explicitParent ?? parentSlug;
    const childCategories = collectChildCategories(item);
    const tags = toArray(item.tag).map((tag, tagIndex) => {
      const tagSlugRaw = tag["@_slug"] ?? "";
      const tagNameRaw = tag["@_name"] ?? "";

      if (!tagSlugRaw || !tagNameRaw) {
        throw new Error(`Tag at index ${tagIndex} for category ${normalizedSlug} must contain slug and name attributes.`);
      }

      return {
        slug: normalizeSlug(tagSlugRaw),
        name: normalizeName(tagNameRaw),
      } satisfies ParsedTag;
    });

    if (childCategories.length > 0 && tags.length > 0) {
      throw new Error(
        `Category ${normalizedSlug} contains subcategories and tags. Tags are allowed only on leaf categories.`,
      );
    }

    target.push({
      slug: normalizedSlug,
      name: normalizeName(nameRaw),
      parentSlug: resolvedParentSlug,
      tags,
    });

    if (childCategories.length > 0) {
      flattenCategories(childCategories, normalizedSlug, target);
    }
  }
}

export function parseTaxonomyXml(xml: string): ParsedCategory[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });

  const parsed = parser.parse(xml) as XmlPayload;
  const categoryItems = [
    ...toArray(parsed.taxonomy?.category),
    ...toArray(parsed.taxonomy?.categories?.category),
  ];

  if (!categoryItems.length) {
    throw new Error("XML does not contain any <category> nodes.");
  }

  const categories: ParsedCategory[] = [];
  flattenCategories(categoryItems, null, categories);

  const slugs = new Set<string>();
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

    if (category.parentSlug === category.slug) {
      throw new Error(`Category ${category.slug} cannot be parent of itself.`);
    }
  }

  for (const category of categories) {
    let currentParent = category.parentSlug;
    const visited = new Set<string>([category.slug]);

    while (currentParent) {
      if (visited.has(currentParent)) {
        throw new Error(`Cycle detected in category hierarchy at ${category.slug}.`);
      }

      visited.add(currentParent);
      const parentCategory = categories.find((entry) => entry.slug === currentParent);
      currentParent = parentCategory?.parentSlug ?? null;
    }
  }

  return categories;
}

export function buildTaxonomyTree(categories: ParsedCategory[]): TaxonomyTreeNode[] {
  const bySlug = new Map<string, TaxonomyTreeNode>();

  for (const category of categories) {
    bySlug.set(category.slug, {
      slug: category.slug,
      name: category.name,
      tags: category.tags,
      children: [],
    });
  }

  const roots: TaxonomyTreeNode[] = [];

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

export function countUniqueTags(categories: ParsedCategory[]) {
  const unique = new Set<string>();

  for (const category of categories) {
    for (const tag of category.tags) {
      unique.add(tag.slug);
    }
  }

  return unique.size;
}
