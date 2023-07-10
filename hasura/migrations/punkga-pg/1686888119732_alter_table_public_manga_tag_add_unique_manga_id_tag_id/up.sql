alter table "public"."manga_tag" add constraint "manga_tag_manga_id_tag_id_key" unique ("manga_id", "tag_id");
