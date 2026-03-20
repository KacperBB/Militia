ALTER TABLE "post_attribute_values"
ALTER COLUMN "value_number" TYPE DECIMAL(18,4)
USING "value_number"::DECIMAL(18,4);
