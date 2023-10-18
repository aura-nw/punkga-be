CREATE TABLE "public"."user_quest_reward" ("id" serial NOT NULL, "user_quest_id" integer NOT NULL, "tx_hash" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY ("id") , FOREIGN KEY ("user_quest_id") REFERENCES "public"."user_quest"("id") ON UPDATE restrict ON DELETE restrict);
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
CREATE TRIGGER "set_public_user_quest_reward_updated_at"
BEFORE UPDATE ON "public"."user_quest_reward"
FOR EACH ROW
EXECUTE PROCEDURE "public"."set_current_timestamp_updated_at"();
COMMENT ON TRIGGER "set_public_user_quest_reward_updated_at" ON "public"."user_quest_reward"
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
