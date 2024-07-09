alter table "public"."i18n"
  add constraint "i18n_quest_id_fkey"
  foreign key ("quest_id")
  references "public"."quests"
  ("id") on update cascade on delete cascade;
