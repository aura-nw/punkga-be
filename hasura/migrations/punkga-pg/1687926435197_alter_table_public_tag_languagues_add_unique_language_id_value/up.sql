alter table "public"."tag_languages" add constraint "tag_languages_language_id_value_key" unique ("language_id", "value");
