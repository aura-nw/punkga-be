alter table "public"."user_quest" drop constraint "user_quest_quest_id_fkey",
  add constraint "user_quest_quest_id_fkey"
  foreign key ("quest_id")
  references "public"."quests"
  ("id") on update cascade on delete cascade;
