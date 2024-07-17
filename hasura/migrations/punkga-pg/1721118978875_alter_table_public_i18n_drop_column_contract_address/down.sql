alter table "public"."i18n" alter column "contract_address" drop not null;
alter table "public"."i18n" add column "contract_address" varchar;
