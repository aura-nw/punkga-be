alter table "public"."chapters" drop constraint "chapters_manga_id_chapter_number_key";
alter table "public"."chapters" add constraint "chapters_manga_id_chapter_number_key" unique ("manga_id", "chapter_number");
