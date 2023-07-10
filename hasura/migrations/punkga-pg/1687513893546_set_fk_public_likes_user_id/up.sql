alter table "public"."likes"
  add constraint "likes_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update restrict on delete restrict;
