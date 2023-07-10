alter table "public"."manga" alter column "publish_date" set default now();
alter table "public"."manga" alter column "publish_date" drop not null;
alter table "public"."manga" add column "publish_date" time;
