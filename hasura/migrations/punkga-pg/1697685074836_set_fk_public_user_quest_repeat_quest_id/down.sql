alter table "public"."user_quest" drop constraint "user_quest_repeat_quest_id_fkey",
  add constraint "user_quest_repeat_quest_id_fkey"
  foreign key ("repeat_quest_id")
  references "public"."repeat_quests"
  ("id") on update restrict on delete restrict;
