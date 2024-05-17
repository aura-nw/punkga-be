CREATE TABLE "public"."launchpad" ("id" serial NOT NULL, "name" text NOT NULL, "mint_price" text NOT NULL, "royalties" text NOT NULL, "max_supply" text NOT NULL, "max_mint_per_address" text NOT NULL, "start_date" timestamptz NOT NULL, "end_date" timestamptz NOT NULL, "description" text NOT NULL, "thumbnail_url" text NOT NULL, "logo_url" text NOT NULL, "featured_images" jsonb NOT NULL, "nft_images" jsonb NOT NULL, "creator_address" text NOT NULL, "status" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "license_token_id" text NOT NULL, PRIMARY KEY ("id") );
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
