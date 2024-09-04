CREATE TABLE "public"."license_tokens" ("id" serial NOT NULL, "license_id" text NOT NULL, "license_template_address" text NOT NULL, "term_id" text NOT NULL, "owner" bpchar NOT NULL, "ip_asset_id" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("owner") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade);COMMENT ON TABLE "public"."license_tokens" IS E'IP Asset licenese tokens';
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
CREATE TRIGGER "set_public_license_tokens_updated_at"
BEFORE UPDATE ON "public"."license_tokens"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_license_tokens_updated_at" ON "public"."license_tokens"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
