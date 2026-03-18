import { db } from "@/lib/db";

export async function listRootCategories() {
  return db.categories.findMany({
    where: { parent_id: null },
    orderBy: { name: "asc" },
  });
}

export async function listCategoryChildren(parentId: string) {
  return db.categories.findMany({
    where: { parent_id: parentId },
    orderBy: { name: "asc" },
  });
}
