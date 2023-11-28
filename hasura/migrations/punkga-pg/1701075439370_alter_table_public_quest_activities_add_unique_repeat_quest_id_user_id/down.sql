alter table "public"."quest_activities" drop constraint "quest_activities_repeat_quest_id_user_id_key";
alter table "public"."quest_activities" add constraint "quest_activities_repeat_quest_id_key" unique ("repeat_quest_id");
