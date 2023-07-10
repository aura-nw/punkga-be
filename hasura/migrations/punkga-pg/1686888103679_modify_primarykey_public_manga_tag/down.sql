alter table "public"."manga_tag" drop constraint "manga_tag_pkey";
alter table "public"."manga_tag"
    add constraint "manga_tag_pkey"
    primary key ("manga_id", "tag_id");
