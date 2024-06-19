CREATE TABLE "public"."i18n" ("id" serial NOT NULL, "campaign_id" integer, "language_id" integer, "data" jsonb NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") );
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
CREATE TRIGGER "set_public_i18n_updated_at"
BEFORE UPDATE ON "public"."i18n"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_i18n_updated_at" ON "public"."i18n"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
