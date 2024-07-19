CREATE TABLE "public"."custodial_wallet_address" ("id" serial NOT NULL, "address" text NOT NULL, "chain_id" integer NOT NULL, "user_id" bpchar NOT NULL, "custodial_wallet_id" integer NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("chain_id") REFERENCES "public"."chains"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("custodial_wallet_id") REFERENCES "public"."user_wallet"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_custodial_wallet_address_updated_at"
BEFORE UPDATE ON "public"."custodial_wallet_address"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_custodial_wallet_address_updated_at" ON "public"."custodial_wallet_address"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
