alter table "public"."launchpad" alter column "royalties" set default '0';
alter table "public"."launchpad" alter column "royalties" drop not null;
