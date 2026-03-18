import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const user = await prisma.users.findUnique({ where: { username: "seller1" }, select: { id: true, username: true, company_id: true, role: true, email_verified_at: true } });
console.log(JSON.stringify(user, null, 2));
await prisma.$disconnect();
