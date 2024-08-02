alter table "public"."manga"
  add constraint "manga_contest_id_fkey"
  foreign key ("contest_id")
  references "public"."contest"
  ("id") on update cascade on delete cascade;
