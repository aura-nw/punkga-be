alter table "public"."creators" alter column "updated_at" set default now();
alter table "public"."creators" alter column "updated_at" drop not null;
alter table "public"."creators" add column "updated_at" timestamptz;
