alter table "public"."chapter_languages" alter column "image_url" drop not null;
alter table "public"."chapter_languages" add column "image_url" text;
