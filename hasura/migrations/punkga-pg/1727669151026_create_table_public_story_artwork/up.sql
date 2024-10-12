CREATE TABLE "public"."story_artwork" ("id" serial NOT NULL, "artwork_id" integer NOT NULL, "ipfs_url" text NOT NULL, "story_ip_asset_id" integer NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("artwork_id") REFERENCES "public"."artworks"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("story_ip_asset_id") REFERENCES "public"."story_ip_asset"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_story_artwork_updated_at"
BEFORE UPDATE ON "public"."story_artwork"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_story_artwork_updated_at" ON "public"."story_artwork"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
