alter table "public"."manga_languages" alter column "is_main_language" set not null;
alter table "public"."manga_languages" alter column "is_main_language" set default 'false';
