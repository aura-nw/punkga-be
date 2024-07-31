alter table "public"."i18n" drop constraint "i18n_launchpad_id_fkey2",
  add constraint "i18n_launchpad_id_fkey2"
  foreign key ("launchpad_id")
  references "public"."launchpad"
  ("id") on update restrict on delete restrict;
