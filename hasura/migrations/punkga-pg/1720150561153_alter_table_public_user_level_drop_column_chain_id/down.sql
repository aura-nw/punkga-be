alter table "public"."user_level"
  add constraint "user_level_chain_id_fkey"
  foreign key (chain_id)
  references "public"."chains"
  (id) on update cascade on delete cascade;
alter table "public"."user_level" alter column "chain_id" drop not null;
alter table "public"."user_level" add column "chain_id" int4;
