alter table "public"."user_collect_character" add constraint "user_collect_character_user_id_story_character_id_key" unique ("user_id", "story_character_id");
