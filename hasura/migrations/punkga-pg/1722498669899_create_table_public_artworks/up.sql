CREATE TABLE "public"."artworks" ("id" serial NOT NULL, "url" text NOT NULL, "source_url" text, "contest_id" integer, "creator_id" integer NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("contest_id") REFERENCES "public"."contest"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_artworks_updated_at"
BEFORE UPDATE ON "public"."artworks"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_artworks_updated_at" ON "public"."artworks"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
