CREATE TABLE "public"."creator_request" ("id" serial NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "data" jsonb NOT NULL, "type" varchar NOT NULL, "creator_id" integer NOT NULL, "manga_id" integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("manga_id") REFERENCES "public"."manga"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_creator_request_updated_at"
BEFORE UPDATE ON "public"."creator_request"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_creator_request_updated_at" ON "public"."creator_request"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
