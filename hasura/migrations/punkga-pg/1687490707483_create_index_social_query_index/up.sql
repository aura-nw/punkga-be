CREATE  INDEX "social_query_index" on
  "public"."social_activities" using btree ("chapter_id", "action_type");
