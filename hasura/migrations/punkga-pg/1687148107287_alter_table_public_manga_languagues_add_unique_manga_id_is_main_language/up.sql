alter table "public"."manga_languages" add constraint "manga_languages_manga_id_is_main_language_key" unique ("manga_id", "is_main_language");
