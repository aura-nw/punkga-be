alter table "public"."story_character"
  add constraint "story_character_story_event_submission_id_fkey"
  foreign key ("story_event_submission_id")
  references "public"."story_event_submission"
  ("id") on update set null on delete set null;
