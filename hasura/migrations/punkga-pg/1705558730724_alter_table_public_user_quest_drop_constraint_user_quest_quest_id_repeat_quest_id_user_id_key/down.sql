alter table "public"."user_quest" add constraint "user_quest_quest_id_repeat_quest_id_user_id_key" unique ("quest_id", "repeat_quest_id", "user_id");
