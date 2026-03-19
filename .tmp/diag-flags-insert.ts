import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  try {
    const post = await db.posts.findFirst({
      where: { id: "cccccccc-1111-1111-1111-cccccccc1111" },
      select: { id: true, title: true, created_by: true },
    });

    const category = await db.moderation_flag_categories.findFirst({
      where: { target_type: "POST", parent_id: null },
      select: { id: true, name: true },
      orderBy: { sort_order: "asc" },
    });

    const reporter = await db.users.findFirst({
      where: { status: "ACTIVE", email_verified_at: { not: null } },
      select: { id: true, email: true },
    });

    console.log({ post, category, reporter });

    if (!post || !category || !reporter) {
      throw new Error("Missing fixtures for test");
    }

    const result = await db.$transaction([
      db.moderation_flags.create({
        data: {
          target_type: "POST",
          target_id: post.id,
          category_id: category.id,
          reason: category.name,
          details: "diag post",
          created_by: reporter.id,
          status: "OPEN",
        },
        select: { id: true },
      }),
      db.moderation_flags.create({
        data: {
          target_type: "USER",
          target_id: post.created_by,
          category_id: category.id,
          reason: `POST_REPORT: ${category.name}`,
          details: "diag user",
          created_by: reporter.id,
          status: "OPEN",
        },
        select: { id: true },
      }),
    ]);

    console.log("ok", result);

    await db.moderation_flags.deleteMany({ where: { details: { in: ["diag post", "diag user"] } } });
  } catch (error) {
    console.error("diag-failure", error);
  } finally {
    await db.$disconnect();
  }
}

void main();
