alter table "public"."creators" drop constraint "creators_email_key";
alter table "public"."creators" add constraint "creators_email_key" unique ("email");
