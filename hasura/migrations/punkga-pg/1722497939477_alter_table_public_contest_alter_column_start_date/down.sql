alter table "public"."contest" add constraint "contest_start_date_key" unique ("start_date");
alter table "public"."contest" alter column "start_date" set not null;
