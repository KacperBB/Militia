import { db } from "../src/lib/db";

async function main() {
  try {
    const rows = await db.moderation_flag_categories.findMany({
      where: { target_type: "POST", is_active: true },
      select: { id: true, slug: true, name: true, parent_id: true },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      take: 100,
    });

    console.log("rows", rows.length);
    console.log(JSON.stringify(rows.slice(0, 10), null, 2));
  } catch (error) {
    console.error("diag-error", error);
  } finally {
    await db.$disconnect();
  }
}

void main();
