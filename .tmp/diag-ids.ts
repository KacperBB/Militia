import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  try {
    const categories = await db.moderation_flag_categories.findMany({
      select: { id: true, name: true },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      take: 10,
    });

    const posts = await db.posts.findMany({
      select: { id: true, title: true },
      orderBy: { created_at: "desc" },
      take: 5,
    });

    console.log("categories", categories);
    console.log("posts", posts);
  } catch (error) {
    console.error(error);
  } finally {
    await db.$disconnect();
  }
}

void main();
