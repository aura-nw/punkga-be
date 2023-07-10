alter table "public"."manga" add column "publish_date" timestamptz
 null default now();
