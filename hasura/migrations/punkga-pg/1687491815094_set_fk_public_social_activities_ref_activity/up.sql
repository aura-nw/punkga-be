alter table "public"."social_activities"
  add constraint "social_activities_ref_activity_fkey"
  foreign key ("ref_activity")
  references "public"."social_activities"
  ("id") on update restrict on delete restrict;
