alter table "public"."creator_request"
  add constraint "creator_request_chapter_id_fkey"
  foreign key ("chapter_id")
  references "public"."chapters"
  ("id") on update cascade on delete cascade;
