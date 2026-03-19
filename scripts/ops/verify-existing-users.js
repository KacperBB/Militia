const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  const total = await db.users.count();
  const unverified = await db.users.count({ where: { email_verified_at: null } });
  const inactive = await db.users.count({ where: { NOT: { status: "ACTIVE" } } });

  console.log("Before:", { total, unverified, inactive });

  const updated = await db.users.updateMany({
    where: {
      OR: [{ email_verified_at: null }, { NOT: { status: "ACTIVE" } }],
    },
    data: {
      email_verified_at: new Date(),
      status: "ACTIVE",
    },
  });

  const unverifiedAfter = await db.users.count({ where: { email_verified_at: null } });
  const inactiveAfter = await db.users.count({ where: { NOT: { status: "ACTIVE" } } });

  console.log("Updated users:", updated.count);
  console.log("After:", { total, unverified: unverifiedAfter, inactive: inactiveAfter });
}

main()
  .catch((error) => {
    console.error("Failed to verify users:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
