alter table "public"."telegram_users"
  add constraint "telegram_users_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update set null on delete set null;
