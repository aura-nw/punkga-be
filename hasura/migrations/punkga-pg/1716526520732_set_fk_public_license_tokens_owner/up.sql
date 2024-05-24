alter table "public"."license_tokens"
  add constraint "license_tokens_owner_fkey"
  foreign key ("owner")
  references "public"."authorizer_users"
  ("id") on update cascade on delete cascade;
