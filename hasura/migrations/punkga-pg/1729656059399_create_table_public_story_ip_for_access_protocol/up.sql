CREATE TABLE "public"."story_ip_for_access_protocol" ("id" serial NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "collection_id" integer NOT NULL, "status" varchar NOT NULL, "contract_address" varchar NOT NULL, "nft_id" varchar NOT NULL, "parent_ipid" varchar NOT NULL, "ip_metadata_uri" varchar, "ip_meatadata_hash" varchar, "nft_metadata_uri" varchar, "nft_metadata_hash" varchar, "ipid" varchar NOT NULL, "txhash" varchar NOT NULL, "owner" varchar, PRIMARY KEY ("id") , FOREIGN KEY ("collection_id") REFERENCES "public"."story_collection_for_access_protocol"("id") ON UPDATE cascade ON DELETE cascade, UNIQUE ("ipid"));
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
CREATE TRIGGER "set_public_story_ip_for_access_protocol_updated_at"
BEFORE UPDATE ON "public"."story_ip_for_access_protocol"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_story_ip_for_access_protocol_updated_at" ON "public"."story_ip_for_access_protocol"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
