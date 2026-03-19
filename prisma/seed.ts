import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { parseTaxonomyXml } from "../src/lib/taxonomy/xml-import";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({ connectionString });

const db = new PrismaClient({
  adapter,
});

const ids = {
  userAdmin: "11111111-1111-1111-1111-111111111111",
  userSeller: "22222222-2222-2222-2222-222222222222",
  userBuyer: "33333333-3333-3333-3333-333333333333",
  userModerator: "44444444-4444-4444-4444-444444444444",
  companyA: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  categoryElectronics: "aaaaaaaa-1111-1111-1111-aaaaaaaa1111",
  categoryPhones: "aaaaaaaa-2222-2222-2222-aaaaaaaa2222",
  categoryServices: "aaaaaaaa-3333-3333-3333-aaaaaaaa3333",
  tagIphone: "bbbbbbbb-1111-1111-1111-bbbbbbbb1111",
  tagWarranty: "bbbbbbbb-2222-2222-2222-bbbbbbbb2222",
  tagRepair: "bbbbbbbb-3333-3333-3333-bbbbbbbb3333",
  postIphone: "cccccccc-1111-1111-1111-cccccccc1111",
  postService: "cccccccc-2222-2222-2222-cccccccc2222",
  imageIphone: "dddddddd-1111-1111-1111-dddddddd1111",
  imageService: "dddddddd-2222-2222-2222-dddddddd2222",
  flagPost: "eeeeeeee-1111-1111-1111-eeeeeeee1111",
  auditPostApprove: "ffffffff-1111-1111-1111-ffffffff1111",
  verificationBuyer: "abababab-1111-1111-1111-abababab1111",
  adminSession: "cdcdcdcd-1111-1111-1111-cdcdcdcd1111",
};

const rawTokens = {
  buyerVerification: "buyer-verification-token-for-tests-2026",
  adminSession: "admin-session-token-for-tests-2026",
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getPasswordPepper() {
  return process.env.PASSWORD_PEPPER || process.env.AUTH_SECRET || "";
}

async function hashSeedPassword(password: string) {
  return bcrypt.hash(`${password}:${getPasswordPepper()}`, 12);
}

async function seedTaxonomy() {
  const xmlPath = join(__dirname, "..", "public", "mock", "taxonomy-sample.xml");
  const xml = readFileSync(xmlPath, "utf-8");
  const categories = parseTaxonomyXml(xml);

  // 1. Upsert all categories (without parent links first).
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of categories) {
    const saved = await db.categories.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, keywords: cat.keywords },
      create: { slug: cat.slug, name: cat.name, keywords: cat.keywords },
      select: { id: true, slug: true },
    });
    categoryIdBySlug.set(saved.slug, saved.id);
  }

  // 2. Apply parent links.
  for (const cat of categories) {
    const categoryId = categoryIdBySlug.get(cat.slug);
    if (!categoryId) continue;
    await db.categories.update({
      where: { id: categoryId },
      data: {
        parent_id: cat.parentSlug ? (categoryIdBySlug.get(cat.parentSlug) ?? null) : null,
      },
    });
  }

  // 3. Upsert attributes and their options.
  for (const cat of categories) {
    const categoryId = categoryIdBySlug.get(cat.slug);
    if (!categoryId || cat.attributes.length === 0) continue;

    for (const attr of cat.attributes) {
      const savedAttr = await db.category_attributes.upsert({
        where: { category_id_slug: { category_id: categoryId, slug: attr.slug } },
        update: {
          name: attr.name,
          attribute_type: attr.type,
          is_required: attr.isRequired,
          sort_order: attr.sortOrder,
        },
        create: {
          category_id: categoryId,
          slug: attr.slug,
          name: attr.name,
          attribute_type: attr.type,
          is_required: attr.isRequired,
          sort_order: attr.sortOrder,
        },
        select: { id: true },
      });

      for (const opt of attr.options) {
        await db.category_attribute_options.upsert({
          where: { attribute_id_value: { attribute_id: savedAttr.id, value: opt.value } },
          update: { label: opt.label, sort_order: opt.sortOrder },
          create: {
            attribute_id: savedAttr.id,
            value: opt.value,
            label: opt.label,
            sort_order: opt.sortOrder,
          },
        });
      }
    }
  }

  const total = await db.categories.count();
  console.log(`Taxonomy seeded: ${categories.length} XML categories → ${total} total in DB.`);
}

async function main() {
  const [adminPasswordHash, sellerPasswordHash, buyerPasswordHash, moderatorPasswordHash] = await Promise.all([
    hashSeedPassword("Admin1234"),
    hashSeedPassword("Seller1234"),
    hashSeedPassword("Buyer1234"),
    hashSeedPassword("Moderator1234"),
  ]);

  // Clean in FK-safe order to keep seed idempotent.
  await db.$transaction([
    db.user_sessions.deleteMany(),
    db.verification_tokens.deleteMany(),
    db.user_credentials.deleteMany(),
    db.audit_log.deleteMany(),
    db.moderation_flags.deleteMany(),
    db.favorites.deleteMany(),
    db.post_images.deleteMany(),
    db.post_tags.deleteMany(),
    db.posts.deleteMany(),
    db.tags.deleteMany(),
    db.categories.deleteMany(),
    db.companies.deleteMany(),
    db.users.deleteMany(),
  ]);

  await db.users.create({
    data: {
      id: ids.userAdmin,
      email: "admin@militia.local",
      username: "admin",
      first_name: "Jan",
      last_name: "Admin",
      phone: "+48111111111",
      role: "ADMIN",
      status: "ACTIVE",
      marketing_consent: true,
      email_verified_at: new Date("2026-03-17T10:00:00.000Z"),
    },
  });

  await db.companies.create({
    data: {
      id: ids.companyA,
      name: "Militia Tech Sp. z o.o.",
      nip: "5251234567",
      email: "biuro@militia.local",
      phone: "+48221234567",
      address: "ul. Testowa 1",
      zip_code: "00-001",
      city: "Warszawa",
      lat: "52.2297",
      lng: "21.0122",
      description: "Sprzedaz elektroniki i serwis.",
      avatar_url: "https://cdn.example.com/company/militia-tech.png",
      accepted_terms: true,
      marketing_consent: true,
      created_by: ids.userAdmin,
    },
  });

  await db.users.createMany({
    data: [
      {
        id: ids.userSeller,
        email: "seller@militia.local",
        username: "seller1",
        first_name: "Anna",
        last_name: "Sprzedawca",
        phone: "+48500111222",
        company_id: ids.companyA,
        role: "USER",
        status: "ACTIVE",
        marketing_consent: false,
        email_verified_at: new Date("2026-03-17T10:30:00.000Z"),
      },
      {
        id: ids.userBuyer,
        email: "buyer@militia.local",
        username: "buyer1",
        first_name: "Piotr",
        last_name: "Kupujacy",
        phone: "+48500333444",
        role: "USER",
        status: "ACTIVE",
        marketing_consent: true,
        email_verified_at: new Date("2026-03-17T10:40:00.000Z"),
      },
      {
        id: ids.userModerator,
        email: "moderator@militia.local",
        username: "moderator1",
        first_name: "Marta",
        last_name: "Moderator",
        phone: "+48500555666",
        role: "MODERATOR",
        status: "ACTIVE",
        marketing_consent: false,
        email_verified_at: new Date("2026-03-17T10:45:00.000Z"),
      },
    ],
  });

  await db.user_credentials.createMany({
    data: [
      {
        user_id: ids.userAdmin,
        password_hash: adminPasswordHash,
      },
      {
        user_id: ids.userSeller,
        password_hash: sellerPasswordHash,
      },
      {
        user_id: ids.userBuyer,
        password_hash: buyerPasswordHash,
      },
      {
        user_id: ids.userModerator,
        password_hash: moderatorPasswordHash,
      },
    ],
  });

  await db.verification_tokens.create({
    data: {
      id: ids.verificationBuyer,
      user_id: ids.userBuyer,
      email: "buyer@militia.local",
      token_hash: sha256(rawTokens.buyerVerification),
      type: "EMAIL_VERIFICATION",
      expires_at: new Date("2026-12-31T23:59:59.000Z"),
      requested_ip: "127.0.0.1",
      user_agent: "seed-script",
    },
  });

  await db.user_sessions.create({
    data: {
      id: ids.adminSession,
      user_id: ids.userAdmin,
      session_token_hash: sha256(rawTokens.adminSession),
      expires_at: new Date("2026-12-31T23:59:59.000Z"),
      ip: "127.0.0.1",
      user_agent: "seed-script",
    },
  });

  await db.categories.createMany({
    data: [
      {
        id: ids.categoryElectronics,
        slug: "elektronika",
        name: "Elektronika",
      },
      {
        id: ids.categoryPhones,
        slug: "telefony",
        name: "Telefony",
        parent_id: ids.categoryElectronics,
      },
      {
        id: ids.categoryServices,
        slug: "uslugi-serwisowe",
        name: "Uslugi serwisowe",
      },
    ],
  });

  await db.tags.createMany({
    data: [
      {
        id: ids.tagIphone,
        slug: "iphone",
        name: "iPhone",
        seo_index: true,
        created_by: ids.userAdmin,
      },
      {
        id: ids.tagWarranty,
        slug: "gwarancja",
        name: "Gwarancja",
        seo_index: false,
        created_by: ids.userAdmin,
      },
      {
        id: ids.tagRepair,
        slug: "naprawa",
        name: "Naprawa",
        seo_index: false,
        created_by: ids.userAdmin,
      },
    ],
  });

  await db.posts.createMany({
    data: [
      {
        id: ids.postIphone,
        title: "iPhone 14 Pro 128GB",
        slug: "iphone-14-pro-128gb",
        description: "Stan bardzo dobry, dowod zakupu, odbior osobisty.",
        price_cents: 349900,
        currency: "PLN",
        category_id: ids.categoryPhones,
        created_by: ids.userSeller,
        company_id: ids.companyA,
        status: "PUBLISHED",
        published_at: new Date("2026-03-17T12:00:00.000Z"),
        expires_at: new Date("2026-04-17T12:00:00.000Z"),
        city: "Warszawa",
        lat: "52.2297",
        lng: "21.0122",
        views_count: 120,
        favorites_count: 9,
        is_promoted: true,
      },
      {
        id: ids.postService,
        title: "Naprawa telefonow do 24h",
        slug: "naprawa-telefonow-do-24h",
        description: "Wymiana szybki i baterii, gwarancja 6 miesiecy.",
        price_cents: 19900,
        currency: "PLN",
        category_id: ids.categoryServices,
        created_by: ids.userSeller,
        company_id: ids.companyA,
        status: "PUBLISHED",
        published_at: new Date("2026-03-17T12:15:00.000Z"),
        expires_at: new Date("2026-04-17T12:15:00.000Z"),
        city: "Warszawa",
        lat: "52.2297",
        lng: "21.0122",
        views_count: 64,
        favorites_count: 4,
        is_promoted: false,
      },
    ],
  });

  await db.post_tags.createMany({
    data: [
      { post_id: ids.postIphone, tag_id: ids.tagIphone },
      { post_id: ids.postIphone, tag_id: ids.tagWarranty },
      { post_id: ids.postService, tag_id: ids.tagRepair },
    ],
    skipDuplicates: true,
  });

  await db.post_images.createMany({
    data: [
      {
        id: ids.imageIphone,
        post_id: ids.postIphone,
        storage_key: "posts/iphone14/front.jpg",
        width: 1600,
        height: 1200,
        mime_type: "image/jpeg",
        size_bytes: 245000,
        sort_order: 0,
      },
      {
        id: ids.imageService,
        post_id: ids.postService,
        storage_key: "posts/service/banner.jpg",
        width: 1280,
        height: 720,
        mime_type: "image/jpeg",
        size_bytes: 180000,
        sort_order: 0,
      },
    ],
  });

  await db.favorites.create({
    data: {
      user_id: ids.userBuyer,
      post_id: ids.postIphone,
    },
  });

  await db.moderation_flags.create({
    data: {
      id: ids.flagPost,
      target_type: "POST",
      target_id: ids.postService,
      reason: "SPAM",
      details: "Testowe zgloszenie do panelu moderatora.",
      created_by: ids.userBuyer,
      status: "OPEN",
    },
  });

  await db.audit_log.create({
    data: {
      id: ids.auditPostApprove,
      actor_user_id: ids.userAdmin,
      action: "POST_APPROVED",
      entity_type: "POST",
      entity_id: ids.postIphone,
      metadata_json: {
        source: "seed",
        note: "Rekord testowy do panelu administracyjnego",
      },
      ip: "127.0.0.1",
      user_agent: "seed-script",
    },
  });

  await seedTaxonomy();

  const counts = {
    users: await db.users.count(),
    companies: await db.companies.count(),
    user_credentials: await db.user_credentials.count(),
    verification_tokens: await db.verification_tokens.count(),
    user_sessions: await db.user_sessions.count(),
    categories: await db.categories.count(),
    tags: await db.tags.count(),
    posts: await db.posts.count(),
    post_tags: await db.post_tags.count(),
    post_images: await db.post_images.count(),
    favorites: await db.favorites.count(),
    moderation_flags: await db.moderation_flags.count(),
    audit_log: await db.audit_log.count(),
  };

  console.log("Seed completed. Counts:", counts);
  console.log("Seed auth test credentials:", {
    admin: { identifier: "admin@militia.local", password: "Admin1234" },
    moderator: { identifier: "moderator1", password: "Moderator1234" },
    sellerCompany: { identifier: "seller1", password: "Seller1234" },
    buyer: { identifier: "buyer1", password: "Buyer1234", verificationToken: rawTokens.buyerVerification },
  });
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
