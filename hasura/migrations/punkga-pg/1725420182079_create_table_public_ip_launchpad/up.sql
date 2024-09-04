CREATE TABLE "public"."ip_launchpad" ("id" serial NOT NULL, "name" text NOT NULL, "mint_price" text NOT NULL, "royalties" text DEFAULT '0', "max_supply" text, "start_date" timestamptz NOT NULL, "end_date" timestamptz NOT NULL, "description" text NOT NULL, "thumbnail_url" text, "logo_url" text, "featured_images" jsonb, "nft_images" jsonb, "creator_address" text, "status" text NOT NULL, "license_token_id" text NOT NULL, "creator_id" bpchar, "metadata_uri_base" text, "metadata_contract_uri" text, "contract_address" text, "license_token_address" text, "onchain_info" jsonb, "tx_hash" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") );
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
CREATE TRIGGER "set_public_ip_launchpad_updated_at"
BEFORE UPDATE ON "public"."ip_launchpad"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_ip_launchpad_updated_at" ON "public"."ip_launchpad"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
