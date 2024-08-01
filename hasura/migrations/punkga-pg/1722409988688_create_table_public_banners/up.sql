CREATE TABLE "public"."banners" ("id" serial NOT NULL, "order_num" integer NOT NULL, "status" text NOT NULL, "target" jsonb NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") );
CREATE OR REPLACE FUNCTION "public"."set_current_timestamp_updated_at"()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "set_public_banners_updated_at"
BEFORE UPDATE ON "public"."banners"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_banners_updated_at" ON "public"."banners"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
