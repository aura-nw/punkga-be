CREATE TABLE "public"."quest_activities" ("id" serial NOT NULL, "quest_id" integer NOT NULL, "user_id" bpchar NOT NULL, "activity" jsonb NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), "repeat_quest_id" integer NOT NULL, PRIMARY KEY ("id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON UPDATE cascade ON DELETE cascade, FOREIGN KEY ("repeat_quest_id") REFERENCES "public"."repeat_quests"("id") ON UPDATE cascade ON DELETE cascade);
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
CREATE TRIGGER "set_public_quest_activities_updated_at"
BEFORE UPDATE ON "public"."quest_activities"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_quest_activities_updated_at" ON "public"."quest_activities"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
