alter table "public"."user_wallet" drop constraint "user_wallet_user_id_fkey",
  add constraint "user_wallet_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update cascade on delete cascade;
