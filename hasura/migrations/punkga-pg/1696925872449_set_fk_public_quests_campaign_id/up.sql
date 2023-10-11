alter table "public"."quests"
  add constraint "quests_campaign_id_fkey"
  foreign key ("campaign_id")
  references "public"."campaign"
  ("id") on update restrict on delete restrict;
