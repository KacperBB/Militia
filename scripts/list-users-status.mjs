import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const users = await prisma.users.findMany({
  select: {
    username: true,
    email: true,
    role: true,
    status: true,
    email_verified_at: true,
  },
  orderBy: { created_at: "desc" },
  take: 15,
});

console.log(JSON.stringify(users, null, 2));
await prisma.$disconnect();
