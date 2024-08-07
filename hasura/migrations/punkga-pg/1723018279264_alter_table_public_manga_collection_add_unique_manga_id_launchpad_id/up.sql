alter table "public"."manga_collection" add constraint "manga_collection_manga_id_launchpad_id_key" unique ("manga_id", "launchpad_id");
