CREATE TABLE "public"."user_read_chapter" ("user_id" bpchar NOT NULL, "chapter_id" integer NOT NULL, "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("chapter_id","user_id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON UPDATE cascade ON DELETE cascade, UNIQUE ("user_id", "chapter_id"));COMMENT ON TABLE "public"."user_read_chapter" IS E'used for check quest requirement';
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
CREATE TRIGGER "set_public_user_read_chapter_updated_at"
BEFORE UPDATE ON "public"."user_read_chapter"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_user_read_chapter_updated_at" ON "public"."user_read_chapter"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
