alter table "public"."albums" add constraint "albums_name_creator_id_key" unique ("name", "creator_id");
