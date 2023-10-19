alter table "public"."likes" drop constraint "likes_chapter_id_fkey",
  add constraint "likes_chapter_id_fkey"
  foreign key ("chapter_id")
  references "public"."chapters"
  ("id") on update restrict on delete restrict;
