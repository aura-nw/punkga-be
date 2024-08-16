CREATE TABLE "public"."albums" ("id" serial NOT NULL, "name" text NOT NULL, "description" text, "show" boolean NOT NULL DEFAULT false, "storage_folder" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") );COMMENT ON TABLE "public"."albums" IS E'albums of artwork';
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
CREATE TRIGGER "set_public_albums_updated_at"
BEFORE UPDATE ON "public"."albums"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_albums_updated_at" ON "public"."albums"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
