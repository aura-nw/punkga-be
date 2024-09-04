CREATE TABLE "public"."ip_asset" ("id" serial NOT NULL, "user_id" bpchar NOT NULL, "nft_token_id" text NOT NULL, "nft_contract_address" text NOT NULL, "ip_asset_id" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_ip_asset_updated_at"
BEFORE UPDATE ON "public"."ip_asset"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_ip_asset_updated_at" ON "public"."ip_asset"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
