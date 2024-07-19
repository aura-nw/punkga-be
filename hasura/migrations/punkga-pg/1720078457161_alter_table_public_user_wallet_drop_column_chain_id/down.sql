comment on column "public"."user_wallet"."chain_id" is E'user custodial wallet';
alter table "public"."user_wallet"
  add constraint "user_wallet_chain_id_fkey"
  foreign key (chain_id)
  references "public"."chains"
  (id) on update cascade on delete cascade;
alter table "public"."user_wallet" alter column "chain_id" drop not null;
alter table "public"."user_wallet" add column "chain_id" int4;
