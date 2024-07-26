alter table "public"."launchpad" alter column "thumbnail_url" drop not null;
alter table "public"."launchpad" add column "thumbnail_url" varchar;
