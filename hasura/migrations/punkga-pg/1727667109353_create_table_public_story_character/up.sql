CREATE TABLE "public"."story_character" ("id" serial NOT NULL, "story_ip_asset_id" integer NOT NULL, "name" text NOT NULL, "avatar_url" text NOT NULL, "descripton_url" text NOT NULL, "ipfs_url" text, "creator_id" integer NOT NULL, "user_id" bpchar NOT NULL, "is_default_character" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("story_ip_asset_id") REFERENCES "public"."story_ip_asset"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_story_character_updated_at"
BEFORE UPDATE ON "public"."story_character"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_story_character_updated_at" ON "public"."story_character"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
