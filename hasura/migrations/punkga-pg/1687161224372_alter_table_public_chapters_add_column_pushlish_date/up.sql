alter table "public"."chapters" add column "pushlish_date" timestamptz
 not null default now();
