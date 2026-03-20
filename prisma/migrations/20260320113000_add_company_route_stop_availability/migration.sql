ALTER TABLE "public"."company_route_stops"
ADD COLUMN "available_from" TIMESTAMPTZ(6),
ADD COLUMN "available_to" TIMESTAMPTZ(6);
