alter table "public"."tags"
  add constraint "tags_language_id_fkey"
  foreign key ("language_id")
  references "public"."languages"
  ("id") on update restrict on delete restrict;
