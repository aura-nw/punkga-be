alter table "public"."user_quest_reward" drop constraint "user_quest_reward_user_quest_id_fkey",
  add constraint "user_quest_reward_user_quest_id_fkey"
  foreign key ("user_quest_id")
  references "public"."user_quest"
  ("id") on update cascade on delete cascade;
