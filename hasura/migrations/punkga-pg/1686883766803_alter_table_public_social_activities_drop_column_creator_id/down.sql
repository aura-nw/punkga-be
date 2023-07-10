alter table "public"."social_activities" alter column "creator_id" drop not null;
alter table "public"."social_activities" add column "creator_id" int4;
