alter table "public"."subscribers" drop constraint "subcribers_manga_id_fkey",
  add constraint "subscribers_manga_id_fkey"
  foreign key ("manga_id")
  references "public"."manga"
  ("id") on update cascade on delete cascade;
