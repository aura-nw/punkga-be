alter table "public"."quest_activities" add constraint "quest_activities_user_id_quest_id_repeat_quest_id_key" unique ("user_id", "quest_id", "repeat_quest_id");
