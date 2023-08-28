alter table "public"."creators" alter column "profile_picture" drop not null;
alter table "public"."creators" add column "profile_picture" text;
