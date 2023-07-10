alter table "public"."tags" add column "created_at" timestamptz
 null default now();
