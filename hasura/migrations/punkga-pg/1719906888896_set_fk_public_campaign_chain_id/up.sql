alter table "public"."campaign"
  add constraint "campaign_chain_id_fkey"
  foreign key ("chain_id")
  references "public"."chains"
  ("id") on update cascade on delete cascade;
