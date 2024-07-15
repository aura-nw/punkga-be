CREATE TABLE "public"."launchpad" ("id" serial NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "thumbnail_url" varchar NOT NULL, "logo_url" varchar NOT NULL, "featured_images" varchar NOT NULL, "creator_id" integer NOT NULL, PRIMARY KEY ("id") );
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
CREATE TRIGGER "set_public_launchpad_updated_at"
BEFORE UPDATE ON "public"."launchpad"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_launchpad_updated_at" ON "public"."launchpad"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
