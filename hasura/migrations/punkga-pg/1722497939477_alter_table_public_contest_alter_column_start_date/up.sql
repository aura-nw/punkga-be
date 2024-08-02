alter table "public"."contest" alter column "start_date" drop not null;
alter table "public"."contest" drop constraint "contest_start_date_key";
