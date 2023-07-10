alter table "public"."manga" alter column "title" drop not null;
alter table "public"."manga" add column "title" text;
