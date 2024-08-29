alter table "public"."albums"
  add constraint "albums_creator_id_fkey"
  foreign key ("creator_id")
  references "public"."creators"
  ("id") on update cascade on delete cascade;
