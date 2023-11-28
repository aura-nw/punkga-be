alter table "public"."quest_activities" add constraint "quest_activities_repeat_quest_id_user_id_key" unique ("repeat_quest_id", "user_id");
