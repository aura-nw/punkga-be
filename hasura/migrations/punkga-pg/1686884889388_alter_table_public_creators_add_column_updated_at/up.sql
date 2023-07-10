alter table "public"."creators" add column "updated_at" timestamptz
 null default now();
