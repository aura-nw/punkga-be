BEGIN TRANSACTION;
ALTER TABLE "public"."manga_tag" DROP CONSTRAINT "manga_tag_pkey";

ALTER TABLE "public"."manga_tag"
    ADD CONSTRAINT "manga_tag_pkey" PRIMARY KEY ("id");
COMMIT TRANSACTION;
