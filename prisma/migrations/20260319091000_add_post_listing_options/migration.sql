-- AlterTable
ALTER TABLE "posts"
ADD COLUMN "is_negotiable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "contact_name" TEXT,
ADD COLUMN "contact_phone" TEXT,
ADD COLUMN "auto_renew" BOOLEAN NOT NULL DEFAULT false;
