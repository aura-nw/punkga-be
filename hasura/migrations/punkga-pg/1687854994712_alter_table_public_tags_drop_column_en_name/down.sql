alter table "public"."tags" alter column "en_name" drop not null;
alter table "public"."tags" add column "en_name" text;
