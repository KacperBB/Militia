-- CreateTable
CREATE TABLE "category_attributes" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "attribute_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "metadata_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_attribute_options" (
    "id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_attribute_values" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "attribute_id" UUID NOT NULL,
    "value_text" TEXT,
    "value_number" INTEGER,
    "value_boolean" BOOLEAN,
    "value_date" TIMESTAMP(3),
    "value_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "post_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_attributes_category_id_idx" ON "category_attributes"("category_id");

-- CreateIndex
CREATE INDEX "category_attributes_attribute_type_idx" ON "category_attributes"("attribute_type");

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_category_id_slug_key" ON "category_attributes"("category_id", "slug");

-- CreateIndex
CREATE INDEX "category_attribute_options_attribute_id_idx" ON "category_attribute_options"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_attribute_options_attribute_id_value_key" ON "category_attribute_options"("attribute_id", "value");

-- CreateIndex
CREATE INDEX "post_attribute_values_post_id_idx" ON "post_attribute_values"("post_id");

-- CreateIndex
CREATE INDEX "post_attribute_values_attribute_id_idx" ON "post_attribute_values"("attribute_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_attribute_values_post_id_attribute_id_key" ON "post_attribute_values"("post_id", "attribute_id");

-- AddForeignKey
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_attribute_options" ADD CONSTRAINT "category_attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attribute_values" ADD CONSTRAINT "post_attribute_values_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attribute_values" ADD CONSTRAINT "post_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
