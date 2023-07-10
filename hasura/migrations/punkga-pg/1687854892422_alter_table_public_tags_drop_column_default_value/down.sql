alter table "public"."tags" alter column "default_value" drop not null;
alter table "public"."tags" add column "default_value" text;
