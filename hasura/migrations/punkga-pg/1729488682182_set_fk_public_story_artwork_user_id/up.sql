alter table "public"."story_artwork"
  add constraint "story_artwork_user_id_fkey"
  foreign key ("user_id")
  references "public"."authorizer_users"
  ("id") on update cascade on delete cascade;
