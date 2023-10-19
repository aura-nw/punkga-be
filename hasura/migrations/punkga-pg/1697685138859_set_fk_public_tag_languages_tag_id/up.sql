alter table "public"."tag_languages" drop constraint "tag_languagues_tag_id_fkey",
  add constraint "tag_languages_tag_id_fkey"
  foreign key ("tag_id")
  references "public"."tags"
  ("id") on update cascade on delete cascade;
