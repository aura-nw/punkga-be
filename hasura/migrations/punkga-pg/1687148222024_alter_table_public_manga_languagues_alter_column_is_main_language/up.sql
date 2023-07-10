ALTER TABLE "public"."manga_languages" ALTER COLUMN "is_main_language" drop default;
alter table "public"."manga_languages" alter column "is_main_language" drop not null;
