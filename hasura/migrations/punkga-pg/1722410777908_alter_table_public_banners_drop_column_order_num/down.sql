alter table "public"."banners" alter column "order_num" drop not null;
alter table "public"."banners" add column "order_num" int4;
