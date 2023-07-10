alter table "public"."tags" alter column "language_id" drop not null;
alter table "public"."tags" add column "language_id" int4;
