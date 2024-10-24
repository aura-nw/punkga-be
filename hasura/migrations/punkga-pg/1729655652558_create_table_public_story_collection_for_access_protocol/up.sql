CREATE TABLE "public"."story_collection_for_access_protocol" ("id" serial NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "name" varchar NOT NULL, "symbol" varchar NOT NULL, "avatar" varchar, "contract_address" varchar NOT NULL, PRIMARY KEY ("id") );
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
CREATE TRIGGER "set_public_story_collection_for_access_protocol_updated_at"
BEFORE UPDATE ON "public"."story_collection_for_access_protocol"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_story_collection_for_access_protocol_updated_at" ON "public"."story_collection_for_access_protocol"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
