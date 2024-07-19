alter table "public"."custodial_wallet_address"
  add constraint "custodial_wallet_address_chain_id_fkey"
  foreign key ("chain_id")
  references "public"."chains"
  ("id") on update cascade on delete cascade;
