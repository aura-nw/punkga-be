alter table "public"."likes"
  add constraint "likes_story_character_id_fkey"
  foreign key ("story_character_id")
  references "public"."story_character"
  ("id") on update cascade on delete cascade;
