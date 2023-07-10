CREATE  INDEX "comment_query_index" on
  "public"."social_activities" using btree ("chapter_id", "action_type", "ref_activity");
