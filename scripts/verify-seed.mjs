import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const posts = await prisma.posts.findMany({
    where: { status: "PUBLISHED" },
    include: {
      category: true,
      company: true,
      tags: {
        include: {
          tag: true,
        },
      },
      images: true,
    },
  });

  const summary = posts.map((post) => ({
    id: post.id,
    title: post.title,
    category: post.category.name,
    company: post.company?.name,
    tags: post.tags.map((item) => item.tag.slug),
    images: post.images.length,
  }));

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await prisma.$disconnect();
}
