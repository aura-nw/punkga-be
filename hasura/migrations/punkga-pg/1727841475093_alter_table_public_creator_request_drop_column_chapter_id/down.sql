alter table "public"."creator_request" alter column "chapter_id" drop not null;
alter table "public"."creator_request" add column "chapter_id" varchar;
