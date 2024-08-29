alter table "public"."artworks"
  add constraint "artworks_album_id_fkey"
  foreign key ("album_id")
  references "public"."albums"
  ("id") on update cascade on delete cascade;
