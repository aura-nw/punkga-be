CREATE  INDEX "query_user_quest_idx" on
  "public"."user_quest" using btree ("quest_id", "repeat_quest_id", "user_id");
