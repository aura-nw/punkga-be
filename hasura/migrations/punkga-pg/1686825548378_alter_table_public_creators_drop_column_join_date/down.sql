alter table "public"."creators" alter column "join_date" drop not null;
alter table "public"."creators" add column "join_date" timestamptz;
