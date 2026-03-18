-- Create moderation flag categories table
CREATE TABLE "moderation_flag_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_type" TEXT NOT NULL DEFAULT 'POST',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "moderation_flag_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "moderation_flag_categories_slug_key" ON "moderation_flag_categories"("slug");
CREATE INDEX "moderation_flag_categories_target_type_is_active_sort_order_idx" ON "moderation_flag_categories"("target_type", "is_active", "sort_order");

-- Link moderation flags with category
ALTER TABLE "moderation_flags"
ADD COLUMN "category_id" UUID;

ALTER TABLE "moderation_flags"
ADD COLUMN "subcategory_id" UUID;

CREATE INDEX "moderation_flags_category_id_idx" ON "moderation_flags"("category_id");
CREATE INDEX "moderation_flags_subcategory_id_idx" ON "moderation_flags"("subcategory_id");

ALTER TABLE "moderation_flags"
ADD CONSTRAINT "moderation_flags_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "moderation_flag_categories"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "moderation_flags"
ADD CONSTRAINT "moderation_flags_subcategory_id_fkey"
FOREIGN KEY ("subcategory_id") REFERENCES "moderation_flag_categories"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add hierarchy support for category tree
ALTER TABLE "moderation_flag_categories"
ADD COLUMN "parent_id" UUID;

CREATE INDEX "moderation_flag_categories_parent_id_idx" ON "moderation_flag_categories"("parent_id");

ALTER TABLE "moderation_flag_categories"
ADD CONSTRAINT "moderation_flag_categories_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "moderation_flag_categories"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Seed default report categories for posts
INSERT INTO "moderation_flag_categories" ("id", "slug", "name", "target_type", "is_active", "sort_order", "updated_at") VALUES
    ('90000000-0000-0000-0000-000000000001', 'spam', 'Spam / reklama', 'POST', true, 10, CURRENT_TIMESTAMP),
    ('90000000-0000-0000-0000-000000000002', 'fraud', 'Oszustwo / scam', 'POST', true, 20, CURRENT_TIMESTAMP),
    ('90000000-0000-0000-0000-000000000003', 'violence', 'Namawianie do przemocy', 'POST', true, 30, CURRENT_TIMESTAMP),
    ('90000000-0000-0000-0000-000000000004', 'illegal', 'Nielegalna tresc', 'POST', true, 40, CURRENT_TIMESTAMP),
    ('90000000-0000-0000-0000-000000000005', 'misleading', 'Wprowadzajace w blad', 'POST', true, 50, CURRENT_TIMESTAMP);

INSERT INTO "moderation_flag_categories" ("id", "slug", "name", "target_type", "parent_id", "is_active", "sort_order", "updated_at") VALUES
    ('90000000-0000-0000-0000-000000000101', 'violence-children', 'Przemoc wobec dzieci', 'POST', '90000000-0000-0000-0000-000000000003', true, 31, CURRENT_TIMESTAMP),
    ('90000000-0000-0000-0000-000000000102', 'violence-animals', 'Przemoc wobec zwierzat', 'POST', '90000000-0000-0000-0000-000000000003', true, 32, CURRENT_TIMESTAMP);
