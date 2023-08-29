alter table "public"."manga" alter column "contract_address" drop not null;
alter table "public"."manga" add column "contract_address" text;
