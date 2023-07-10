alter table "public"."manga_languages" add constraint "manga_languages_language_id_manga_id_is_main_language_key" unique ("language_id", "manga_id", "is_main_language");
