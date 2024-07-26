alter table "public"."user_level" drop constraint "user_level_pkey";
alter table "public"."user_level"
    add constraint "user_level_pkey"
    primary key ("user_id");
