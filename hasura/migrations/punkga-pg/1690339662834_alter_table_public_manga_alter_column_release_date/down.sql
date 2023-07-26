ALTER TABLE "public"."manga" ALTER COLUMN "release_date" drop default;
ALTER TABLE "public"."manga" ALTER COLUMN "release_date" TYPE date;
