import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

function getMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const { categoryId } = await params;

  const category = await db.categories.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    return NextResponse.json({ message: "Category not found." }, { status: 404 });
  }

  const inheritanceChain = [category.id];
  let currentParentId = await db.categories.findUnique({
    where: { id: categoryId },
    select: { parent_id: true },
  }).then((result) => result?.parent_id ?? null);

  while (currentParentId) {
    inheritanceChain.unshift(currentParentId);
    currentParentId = await db.categories.findUnique({
      where: { id: currentParentId },
      select: { parent_id: true },
    }).then((result) => result?.parent_id ?? null);
  }

  const attributes = await db.category_attributes.findMany({
    where: {
      category_id: {
        in: inheritanceChain,
      },
    },
    orderBy: [{ sort_order: "asc" }],
    select: {
      id: true,
      category_id: true,
      name: true,
      slug: true,
      attribute_type: true,
      is_required: true,
      sort_order: true,
      metadata_json: true,
      options: {
        orderBy: { sort_order: "asc" },
        select: {
          id: true,
          label: true,
          value: true,
          sort_order: true,
        },
      },
    },
  });

  const chainOrder = new Map(inheritanceChain.map((id, index) => [id, index]));
  const mergedBySlug = new Map<string, (typeof attributes)[number]>();

  for (const attribute of attributes.sort((left, right) => {
    const leftOrder = chainOrder.get(left.category_id) ?? 0;
    const rightOrder = chainOrder.get(right.category_id) ?? 0;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.sort_order - right.sort_order;
  })) {
    mergedBySlug.set(attribute.slug, attribute);
  }

  const mergedAttributes = [...mergedBySlug.values()].sort((left, right) => {
    const leftOrder = chainOrder.get(left.category_id) ?? 0;
    const rightOrder = chainOrder.get(right.category_id) ?? 0;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.sort_order - right.sort_order;
  });

  return NextResponse.json(
    {
      categoryId,
      attributes: mergedAttributes.map((attr) => ({
        id: attr.id,
        name: attr.name,
        slug: attr.slug,
        type: attr.attribute_type,
        isRequired: attr.is_required,
        sortOrder: attr.sort_order,
        metadata: attr.metadata_json,
        presentation: getMetadataValue(attr.metadata_json, "presentation") ?? getMetadataValue(attr.metadata_json, "ui") ?? null,
        options: attr.options.map((opt) => ({
          id: opt.id,
          label: opt.label,
          value: opt.value,
          sortOrder: opt.sort_order,
        })),
      })),
    },
    { status: 200 },
  );
}
