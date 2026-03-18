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

function buildTree(items: CategoryRow[], parentId: string | null = null): CategoryTreeNode[] {
  return items
    .filter((item) => item.parent_id === parentId)
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      children: buildTree(items, item.id),
    }));
}

export async function GET(request: NextRequest) {
  const targetType = request.nextUrl.searchParams.get("targetType") ?? "POST";

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
}
