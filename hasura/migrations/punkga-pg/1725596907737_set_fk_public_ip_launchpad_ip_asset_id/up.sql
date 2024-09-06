alter table "public"."ip_launchpad"
  add constraint "ip_launchpad_ip_asset_id_fkey"
  foreign key ("ip_asset_id")
  references "public"."ip_asset"
  ("ip_asset_id") on update cascade on delete cascade;
