alter table "public"."custodial_wallet_address"
  add constraint "custodial_wallet_address_chain_id_fkey"
  foreign key (chain_id)
  references "public"."chains"
  (id) on update cascade on delete cascade;
alter table "public"."custodial_wallet_address" alter column "chain_id" drop not null;
alter table "public"."custodial_wallet_address" add column "chain_id" int4;
