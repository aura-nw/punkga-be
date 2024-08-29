alter table "public"."i18n"
  add constraint "i18n_contest_id_fkey"
  foreign key ("contest_id")
  references "public"."contest"
  ("id") on update cascade on delete cascade;
