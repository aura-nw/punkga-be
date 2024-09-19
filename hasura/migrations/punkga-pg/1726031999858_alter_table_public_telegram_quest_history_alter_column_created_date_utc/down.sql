alter table "public"."telegram_quest_history" rename column "created_date" to "created_date_utc";
ALTER TABLE "public"."telegram_quest_history" ALTER COLUMN "created_date_utc" drop default;
