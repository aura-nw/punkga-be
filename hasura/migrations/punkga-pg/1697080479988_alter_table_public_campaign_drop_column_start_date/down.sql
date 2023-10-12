alter table "public"."campaign" alter column "start_date" drop not null;
alter table "public"."campaign" add column "start_date" timestamptz;
