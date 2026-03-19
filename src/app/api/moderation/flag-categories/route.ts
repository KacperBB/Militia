import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
};

type CategoryTreeNode = {
  id: string;
  slug: string;
  name: string;
  children: CategoryTreeNode[];
};

function buildTree(items: CategoryRow[]): CategoryTreeNode[] {
  const childrenByParent = new Map<string | null, CategoryRow[]>();

  for (const item of items) {
    const key = item.parent_id;
    const existing = childrenByParent.get(key);
    if (existing) {
      existing.push(item);
    } else {
      childrenByParent.set(key, [item]);
    }
  }

  const included = new Set<string>();

  function buildNode(item: CategoryRow, path: Set<string>): CategoryTreeNode {
    if (path.has(item.id)) {
      return {
        id: item.id,
        slug: item.slug,
        name: item.name,
        children: [],
      };
    }

    const nextPath = new Set(path);
    nextPath.add(item.id);
    included.add(item.id);

    const children = (childrenByParent.get(item.id) ?? []).map((child) => buildNode(child, nextPath));

    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      children,
    };
  }

  const roots = (childrenByParent.get(null) ?? []).map((root) => buildNode(root, new Set<string>()));

  // Include orphaned or cyclic nodes that are not reachable from root records.
  for (const item of items) {
    if (!included.has(item.id)) {
      roots.push(buildNode(item, new Set<string>()));
    }
  }

  return roots;
}

export async function GET(request: NextRequest) {
  const requestedTargetType = (request.nextUrl.searchParams.get("targetType") ?? "POST").toUpperCase();
  const targetType = requestedTargetType === "USER" ? "USER" : "POST";

  try {
    const categories = await db.moderation_flag_categories.findMany({
      where: {
        target_type: targetType,
        is_active: true,
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        parent_id: true,
      },
    });

    return NextResponse.json({
      categories: buildTree(categories),
    });
  } catch (error) {
    console.error("Failed to fetch moderation flag categories", error);
    return NextResponse.json(
      { message: "Failed to fetch categories.", categories: [] },
      { status: 500 },
    );
  }
}
