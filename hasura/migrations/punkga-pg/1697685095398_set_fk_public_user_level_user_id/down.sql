alter table "public"."user_level" drop constraint "user_level_user_id_fkey",
  add constraint "user_level_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update restrict on delete restrict;
