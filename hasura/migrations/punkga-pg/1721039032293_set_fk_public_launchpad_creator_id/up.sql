alter table "public"."launchpad"
  add constraint "launchpad_creator_id_fkey"
  foreign key ("creator_id")
  references "public"."creators"
  ("id") on update cascade on delete cascade;
