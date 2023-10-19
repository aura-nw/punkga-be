alter table "public"."tag_languages" drop constraint "tag_languages_language_id_fkey",
  add constraint "tag_languagues_language_id_fkey"
  foreign key ("language_id")
  references "public"."languages"
  ("id") on update restrict on delete restrict;
