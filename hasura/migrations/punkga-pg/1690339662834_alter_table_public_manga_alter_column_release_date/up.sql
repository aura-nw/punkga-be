ALTER TABLE "public"."manga" ALTER COLUMN "release_date" TYPE timestamptz;
alter table "public"."manga" alter column "release_date" set default now();
