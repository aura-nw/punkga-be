alter table "public"."i18n"
  add constraint "i18n_banner_id_fkey"
  foreign key ("banner_id")
  references "public"."banners"
  ("id") on update cascade on delete cascade;
