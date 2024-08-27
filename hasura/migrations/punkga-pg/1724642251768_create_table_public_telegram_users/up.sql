CREATE TABLE "public"."telegram_users" ("id" serial NOT NULL, "telegram_id" text NOT NULL, "username" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") );
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
CREATE TRIGGER "set_public_telegram_users_updated_at"
BEFORE UPDATE ON "public"."telegram_users"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_telegram_users_updated_at" ON "public"."telegram_users"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
