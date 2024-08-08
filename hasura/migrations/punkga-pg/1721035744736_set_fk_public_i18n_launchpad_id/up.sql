alter table "public"."i18n"
  add constraint "i18n_launchpad_id_fkey2"
  foreign key ("launchpad_id")
  references "public"."launchpad"
  ("id") on update restrict on delete restrict;
