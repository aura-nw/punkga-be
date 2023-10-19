alter table "public"."user_quest" drop constraint "user_quest_user_id_fkey",
  add constraint "user_quest_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update restrict on delete restrict;
