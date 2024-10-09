alter table "public"."likes" add constraint "likes_user_id_story_character_id_key" unique ("user_id", "story_character_id");
