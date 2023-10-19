alter table "public"."subscribers" drop constraint "subcribers_user_id_fkey",
  add constraint "subscribers_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update cascade on delete cascade;
