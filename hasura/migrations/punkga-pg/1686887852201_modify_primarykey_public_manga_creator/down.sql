alter table "public"."manga_creator" drop constraint "manga_creator_pkey";
alter table "public"."manga_creator"
    add constraint "manga_creator_pkey"
    primary key ("creator_id", "manga_id");
