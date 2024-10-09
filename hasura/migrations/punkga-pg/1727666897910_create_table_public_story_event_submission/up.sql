CREATE TABLE "public"."story_event_submission" ("id" serial NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "user_id" bpchar NOT NULL, "data" jsonb NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_story_event_submission_updated_at"
BEFORE UPDATE ON "public"."story_event_submission"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_story_event_submission_updated_at" ON "public"."story_event_submission"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
