alter table "public"."repeat_quests" drop constraint "repeat_quests_quest_id_fkey",
  add constraint "repeat_quests_quest_id_fkey"
  foreign key ("quest_id")
  references "public"."quests"
  ("id") on update restrict on delete restrict;
