alter table "public"."i18n"
  add constraint "i18n_language_id_fkey"
  foreign key ("language_id")
  references "public"."languages"
  ("id") on update cascade on delete cascade;
