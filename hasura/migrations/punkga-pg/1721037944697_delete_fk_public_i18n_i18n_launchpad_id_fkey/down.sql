alter table "public"."i18n"
  add constraint "i18n_launchpad_id_fkey"
  foreign key ("launchpad_id")
  references "public"."i18n"
  ("id") on update restrict on delete restrict;
