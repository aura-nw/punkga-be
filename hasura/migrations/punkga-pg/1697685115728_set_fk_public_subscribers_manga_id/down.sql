alter table "public"."subscribers" drop constraint "subscribers_manga_id_fkey",
  add constraint "subcribers_manga_id_fkey"
  foreign key ("manga_id")
  references "public"."manga"
  ("id") on update restrict on delete restrict;
