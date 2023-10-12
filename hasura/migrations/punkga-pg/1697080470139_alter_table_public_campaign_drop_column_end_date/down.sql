alter table "public"."campaign" alter column "end_date" drop not null;
alter table "public"."campaign" add column "end_date" timestamptz;
