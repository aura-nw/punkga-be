alter table "public"."user_wallet" add column "created_at" timestamptz
 null default now();
