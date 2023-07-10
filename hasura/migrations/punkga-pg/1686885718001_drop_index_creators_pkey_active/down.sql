CREATE  INDEX "creators_pkey_active" on
  "public"."creators" using btree ("id", "isActive");
