alter table "public"."creators" alter column "social_link" drop not null;
alter table "public"."creators" add column "social_link" text;
