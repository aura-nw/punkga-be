alter table "public"."manga_creator" add constraint "manga_creator_manga_id_creator_id_key" unique ("manga_id", "creator_id");
