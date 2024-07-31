alter table "public"."launchpad" alter column "featured_images" drop not null;
alter table "public"."launchpad" add column "featured_images" varchar;
