alter table "public"."tags" alter column "vn_name" drop not null;
alter table "public"."tags" add column "vn_name" text;
