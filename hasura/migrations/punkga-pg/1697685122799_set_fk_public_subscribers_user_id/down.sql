alter table "public"."subscribers" drop constraint "subscribers_user_id_fkey",
  add constraint "subcribers_user_id_fkey"
  foreign key ("manga_id")
  references "public"."manga"
  ("id") on update cascade on delete cascade;
