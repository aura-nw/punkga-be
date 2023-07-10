CREATE  INDEX "query_manga_chapter_index" on
  "public"."chapters" using btree ("manga_id", "chapter_number");
