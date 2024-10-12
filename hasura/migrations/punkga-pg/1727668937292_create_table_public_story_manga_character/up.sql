CREATE TABLE "public"."story_manga_character" ("id" serial NOT NULL, "story_manga_id" integer NOT NULL, "story_character_id" integer NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("story_manga_id") REFERENCES "public"."story_manga"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("story_character_id") REFERENCES "public"."story_character"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_story_manga_character_updated_at"
BEFORE UPDATE ON "public"."story_manga_character"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_story_manga_character_updated_at" ON "public"."story_manga_character"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
