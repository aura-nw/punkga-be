alter table "public"."user_campaign_reward"
  add constraint "user_campaign_reward_request_id_fkey"
  foreign key ("request_id")
  references "public"."request_log"
  ("id") on update cascade on delete cascade;
