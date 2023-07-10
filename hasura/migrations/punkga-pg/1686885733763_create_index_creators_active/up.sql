CREATE  INDEX "creators_active" on
  "public"."creators" using hash ("isActive");
