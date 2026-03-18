import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function getPasswordPepper() {
  return process.env.PASSWORD_PEPPER || process.env.AUTH_SECRET || "";
}

function toPepperedPassword(password) {
  return `${password}:${getPasswordPepper()}`;
}

const VERIFIED_AT = new Date();

const accounts = [
  {
    email: "admin@militia.local",
    username: "admin",
    password: "Admin1234",
    role: "ADMIN",
    firstName: "Jan",
    lastName: "Admin",
    phone: "+48111111111",
  },
  {
    email: "moderator@militia.local",
    username: "moderator1",
    password: "Moderator1234",
    role: "MODERATOR",
    firstName: "Marta",
    lastName: "Moderator",
    phone: "+48500555666",
  },
  {
    email: "seller@militia.local",
    username: "seller1",
    password: "Seller1234",
    role: "USER",
    firstName: "Anna",
    lastName: "Sprzedawca",
    phone: "+48500111222",
  },
  {
    email: "buyer@militia.local",
    username: "buyer1",
    password: "Buyer1234",
    role: "USER",
    firstName: "Piotr",
    lastName: "Kupujacy",
    phone: "+48500333444",
  },
];

const sellerCompanyData = {
  name: "Militia Seller Company",
  nip: "5257654321",
  email: "seller-company@militia.local",
  phone: "+48225556677",
  address: "ul. Handlowa 7",
  zip_code: "00-950",
  city: "Warszawa",
  description: "Profil firmowy konta sprzedawcy do testow panelu ustawien.",
  accepted_terms: true,
  marketing_consent: false,
};

try {
  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(toPepperedPassword(account.password), 12);

    const user = await prisma.users.upsert({
      where: { email: account.email },
      update: {
        username: account.username,
        first_name: account.firstName,
        last_name: account.lastName,
        phone: account.phone,
        role: account.role,
        status: "ACTIVE",
        email_verified_at: VERIFIED_AT,
      },
      create: {
        email: account.email,
        username: account.username,
        first_name: account.firstName,
        last_name: account.lastName,
        phone: account.phone,
        role: account.role,
        status: "ACTIVE",
        email_verified_at: VERIFIED_AT,
      },
      select: { id: true, username: true, email: true, role: true, email_verified_at: true },
    });

    await prisma.user_credentials.upsert({
      where: { user_id: user.id },
      update: {
        password_hash: passwordHash,
      },
      create: {
        user_id: user.id,
        password_hash: passwordHash,
      },
    });

    console.log(
      JSON.stringify({
        username: user.username,
        email: user.email,
        role: user.role,
        verified: Boolean(user.email_verified_at),
      }),
    );
  }

  const seller = await prisma.users.findUniqueOrThrow({
    where: { email: "seller@militia.local" },
    select: { id: true, company_id: true },
  });

  const sellerCompany = await prisma.companies.upsert({
    where: { nip: sellerCompanyData.nip },
    update: {
      ...sellerCompanyData,
      created_by: seller.id,
    },
    create: {
      ...sellerCompanyData,
      created_by: seller.id,
    },
    select: { id: true, name: true },
  });

  if (seller.company_id !== sellerCompany.id) {
    await prisma.users.update({
      where: { id: seller.id },
      data: { company_id: sellerCompany.id },
    });
  }

  console.log(JSON.stringify({ username: "seller1", companyLinked: true, company: sellerCompany.name }));
} finally {
  await prisma.$disconnect();
}
