alter table "public"."tags" alter column "tag" drop not null;
alter table "public"."tags" add column "tag" text;
