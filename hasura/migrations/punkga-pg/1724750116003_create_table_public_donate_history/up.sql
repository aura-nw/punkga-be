CREATE TABLE "public"."donate_history" ("id" serial NOT NULL, "telegram_id" text NOT NULL, "creator_id" integer NOT NULL, "txn" text NOT NULL, "value" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("telegram_id") REFERENCES "public"."telegram_users"("telegram_id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_donate_history_updated_at"
BEFORE UPDATE ON "public"."donate_history"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_donate_history_updated_at" ON "public"."donate_history"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
