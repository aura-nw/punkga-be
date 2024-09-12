alter table "public"."telegram_quest_history"
  add constraint "telegram_quest_history_telegram_user_id_fkey"
  foreign key ("telegram_user_id")
  references "public"."telegram_users"
  ("id") on update restrict on delete no action;
