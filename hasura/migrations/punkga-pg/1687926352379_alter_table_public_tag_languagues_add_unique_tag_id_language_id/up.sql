alter table "public"."tag_languages" drop constraint "tag_languages_tag_id_language_id_value_key";
alter table "public"."tag_languages" add constraint "tag_languages_tag_id_language_id_key" unique ("tag_id", "language_id");
