alter table "public"."chapter_languages" add constraint "chapter_languages_chapter_id_language_id_key" unique ("chapter_id", "language_id");
