alter table "public"."chapters" drop constraint "chapters_manga_id_chapter_number_key";
alter table "public"."chapters" add constraint "chapters_chapter_number_manga_id_key" unique ("chapter_number", "manga_id");
