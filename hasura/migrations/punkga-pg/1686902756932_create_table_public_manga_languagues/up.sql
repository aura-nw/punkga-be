CREATE TABLE "public"."manga_languages" ("id" serial NOT NULL, "manga_id" integer NOT NULL, "language_id" integer NOT NULL, "title" text NOT NULL, "description" text NOT NULL, "is_main_language" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("manga_id") REFERENCES "public"."manga"("id") ON UPDATE restrict ON DELETE restrict, FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON UPDATE restrict ON DELETE restrict, UNIQUE ("manga_id", "language_id"));COMMENT ON TABLE "public"."manga_languages" IS E'bridge table';
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
CREATE TRIGGER "set_public_manga_languages_updated_at"
BEFORE UPDATE ON "public"."manga_languages"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_manga_languages_updated_at" ON "public"."manga_languages"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
