alter table "public"."user_campaign" add constraint "user_campaign_user_id_campaign_id_key" unique ("user_id", "campaign_id");
