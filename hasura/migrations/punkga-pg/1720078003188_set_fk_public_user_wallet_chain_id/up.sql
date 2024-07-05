alter table "public"."user_wallet"
  add constraint "user_wallet_chain_id_fkey"
  foreign key ("chain_id")
  references "public"."chains"
  ("id") on update cascade on delete cascade;
