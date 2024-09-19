alter table "public"."donate_history" alter column "value" drop not null;
alter table "public"."donate_history" add column "value" text;
