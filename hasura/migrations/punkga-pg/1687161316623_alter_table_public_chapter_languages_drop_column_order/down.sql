alter table "public"."chapter_languages" alter column "order" drop not null;
alter table "public"."chapter_languages" add column "order" int4;
