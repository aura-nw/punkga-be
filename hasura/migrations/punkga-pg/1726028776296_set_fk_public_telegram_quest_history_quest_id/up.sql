alter table "public"."telegram_quest_history"
  add constraint "telegram_quest_history_quest_id_fkey"
  foreign key ("quest_id")
  references "public"."telegram_quests"
  ("id") on update restrict on delete no action;
