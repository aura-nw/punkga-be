alter table "public"."i18n"
  add constraint "i18n_campaign_id_fkey"
  foreign key ("campaign_id")
  references "public"."campaign"
  ("id") on update cascade on delete cascade;
