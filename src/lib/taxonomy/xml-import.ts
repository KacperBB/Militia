import { XMLParser } from "fast-xml-parser";

import type {
  ParsedAttribute,
  ParsedAttributeOption,
  ParsedCategory,
  ParsedTag,
  TaxonomyTreeNode,
} from "@/lib/taxonomy/types";

const ATTRIBUTE_TYPES = ["text", "number", "boolean", "date", "select", "multiselect"] as const;

type ParsedAttributeType = (typeof ATTRIBUTE_TYPES)[number];

type XmlTag = {
  "@_slug"?: string;
  "@_name"?: string;
};

type XmlAttributeOption = {
  "@_value"?: string;
  "#text"?: string;
};

type XmlAttribute = {
  "@_slug"?: string;
  "@_name"?: string;
  "@_type"?: string;
  "@_required"?: string | boolean;
  "@_sortOrder"?: string;
  option?: XmlAttributeOption | XmlAttributeOption[];
  [key: string]: unknown;
};

type XmlCategory = {
  "@_slug"?: string;
  "@_name"?: string;
  "@_parentSlug"?: string;
  tag?: XmlTag | XmlTag[];
  attribute?: XmlAttribute | XmlAttribute[];
  attributes?: {
    attribute?: XmlAttribute | XmlAttribute[];
  };
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

function normalizeBoolean(input: string | boolean | undefined) {
  if (typeof input === "boolean") {
    return input;
  }

  if (!input) {
    return false;
  }

  return ["1", "true", "yes"].includes(input.trim().toLowerCase());
}

function normalizeSortOrder(input: string | undefined, fallback: number) {
  if (!input) {
    return fallback;
  }

  const parsed = Number(input);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid sortOrder value: ${input}`);
  }

  return parsed;
}

function normalizeAttributeType(input: string | undefined): ParsedAttributeType {
  const normalized = (input ?? "").trim().toLowerCase();

  if (!normalized || !ATTRIBUTE_TYPES.includes(normalized as ParsedAttributeType)) {
    throw new Error(
      `Attribute type must be one of: ${ATTRIBUTE_TYPES.join(", ")}. Received: ${input ?? "<empty>"}`,
    );
  }

  return normalized as ParsedAttributeType;
}

function collectCategoryAttributes(item: XmlCategory): XmlAttribute[] {
  return [...toArray(item.attribute), ...toArray(item.attributes?.attribute)];
}

function extractAttributeMetadata(attribute: XmlAttribute) {
  const metadata: Record<string, string> = {};

  for (const [key, value] of Object.entries(attribute)) {
    if (!key.startsWith("@_")) {
      continue;
    }

    if (["@_slug", "@_name", "@_type", "@_required", "@_sortOrder"].includes(key)) {
      continue;
    }

    const normalizedKey = key.replace(/^@_/, "");
    metadata[normalizedKey] = String(value ?? "").trim();
  }

  return metadata;
}

function parseAttributeOptions(categorySlug: string, attributeSlug: string, item: XmlAttribute): ParsedAttributeOption[] {
  const options = toArray(item.option);

  return options.map((option, index) => {
    const valueRaw = option["@_value"] ?? "";
    const labelRaw = option["#text"] ?? valueRaw;

    if (!valueRaw.trim()) {
      throw new Error(
        `Attribute option at index ${index} for ${categorySlug}/${attributeSlug} must contain value attribute.`,
      );
    }

    return {
      value: valueRaw.trim(),
      label: String(labelRaw).trim(),
      sortOrder: index,
    } satisfies ParsedAttributeOption;
  });
}

function parseCategoryAttributes(item: XmlCategory, categorySlug: string): ParsedAttribute[] {
  const attributes = collectCategoryAttributes(item);

  return attributes.map((attribute, index) => {
    const slugRaw = attribute["@_slug"] ?? "";
    const nameRaw = attribute["@_name"] ?? "";

    if (!slugRaw || !nameRaw) {
      throw new Error(`Attribute at index ${index} for category ${categorySlug} must contain slug and name attributes.`);
    }

    const slug = normalizeSlug(slugRaw);
    const type = normalizeAttributeType(attribute["@_type"]);
    const options = parseAttributeOptions(categorySlug, slug, attribute);

    if ((type === "select" || type === "multiselect") && options.length === 0) {
      throw new Error(`Attribute ${categorySlug}/${slug} of type ${type} must include at least one option.`);
    }

    if ((type === "text" || type === "number" || type === "boolean" || type === "date") && options.length > 0) {
      throw new Error(`Attribute ${categorySlug}/${slug} of type ${type} cannot define options.`);
    }

    const optionValueSet = new Set<string>();
    for (const option of options) {
      const key = option.value.toLowerCase();
      if (optionValueSet.has(key)) {
        throw new Error(`Duplicate option value \"${option.value}\" in attribute ${categorySlug}/${slug}.`);
      }
      optionValueSet.add(key);
    }

    return {
      slug,
      name: normalizeName(nameRaw),
      type,
      isRequired: normalizeBoolean(attribute["@_required"]),
      sortOrder: normalizeSortOrder(attribute["@_sortOrder"]?.toString(), index),
      options,
      metadata: extractAttributeMetadata(attribute),
    } satisfies ParsedAttribute;
  });
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
    const attributes = parseCategoryAttributes(item, normalizedSlug);
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

    const attributeSlugs = new Set<string>();
    for (const attribute of attributes) {
      if (attributeSlugs.has(attribute.slug)) {
        throw new Error(`Duplicate attribute slug ${attribute.slug} in category ${normalizedSlug}.`);
      }
      attributeSlugs.add(attribute.slug);
    }

    target.push({
      slug: normalizedSlug,
      name: normalizeName(nameRaw),
      parentSlug: resolvedParentSlug,
      tags,
      attributes,
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
      attributes: category.attributes,
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

export function countAttributes(categories: ParsedCategory[]) {
  return categories.reduce((sum, category) => sum + category.attributes.length, 0);
}

export function countAttributeOptions(categories: ParsedCategory[]) {
  return categories.reduce(
    (sum, category) => sum + category.attributes.reduce((inner, attribute) => inner + attribute.options.length, 0),
    0,
  );
}
