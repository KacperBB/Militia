CREATE TABLE "company_route_stops" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "zip_code" TEXT,
    "notes" TEXT,
    "lat" DECIMAL(10,7) NOT NULL,
    "lng" DECIMAL(10,7) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_route_stops_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_route_stops_company_id_sort_order_key"
ON "company_route_stops"("company_id", "sort_order");

CREATE INDEX "company_route_stops_company_id_sort_order_idx"
ON "company_route_stops"("company_id", "sort_order");

CREATE INDEX "company_route_stops_lat_lng_idx"
ON "company_route_stops"("lat", "lng");

ALTER TABLE "company_route_stops"
ADD CONSTRAINT "company_route_stops_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;