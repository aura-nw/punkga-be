CREATE TABLE "public"."user_persional_wallet" ("id" serial NOT NULL, "user_id" bpchar NOT NULL, "chain_id" integer NOT NULL, "address" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("chain_id") REFERENCES "public"."chains"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_user_persional_wallet_updated_at"
BEFORE UPDATE ON "public"."user_persional_wallet"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_user_persional_wallet_updated_at" ON "public"."user_persional_wallet"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
