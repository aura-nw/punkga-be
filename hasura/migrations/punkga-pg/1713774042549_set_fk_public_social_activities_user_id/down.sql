alter table "public"."social_activities" drop constraint "social_activities_user_id_fkey",
  add constraint "social_activities_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update restrict on delete restrict;
