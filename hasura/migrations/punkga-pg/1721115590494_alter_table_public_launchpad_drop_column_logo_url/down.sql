alter table "public"."launchpad" alter column "logo_url" drop not null;
alter table "public"."launchpad" add column "logo_url" varchar;
