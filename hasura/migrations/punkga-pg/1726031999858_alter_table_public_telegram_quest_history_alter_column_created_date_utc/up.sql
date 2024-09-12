alter table "public"."telegram_quest_history" alter column "created_date_utc" set default now();
alter table "public"."telegram_quest_history" rename column "created_date_utc" to "created_date";
