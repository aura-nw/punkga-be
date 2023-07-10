alter table "public"."manga" alter column "description" drop not null;
alter table "public"."manga" add column "description" text;
