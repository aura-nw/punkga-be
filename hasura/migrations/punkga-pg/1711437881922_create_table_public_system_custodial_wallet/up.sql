CREATE TABLE "public"."system_custodial_wallet" ("id" serial NOT NULL, "address" text NOT NULL, "data" text NOT NULL, "type" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , UNIQUE ("address"));
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
CREATE TRIGGER "set_public_system_custodial_wallet_updated_at"
BEFORE UPDATE ON "public"."system_custodial_wallet"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_system_custodial_wallet_updated_at" ON "public"."system_custodial_wallet"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
