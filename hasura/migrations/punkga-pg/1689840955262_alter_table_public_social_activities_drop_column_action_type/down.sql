alter table "public"."social_activities" alter column "action_type" drop not null;
alter table "public"."social_activities" add column "action_type" text;
