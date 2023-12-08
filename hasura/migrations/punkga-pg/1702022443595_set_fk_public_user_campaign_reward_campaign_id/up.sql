alter table "public"."user_campaign_reward"
  add constraint "user_campaign_reward_campaign_id_fkey"
  foreign key ("campaign_id")
  references "public"."campaign"
  ("id") on update cascade on delete cascade;
