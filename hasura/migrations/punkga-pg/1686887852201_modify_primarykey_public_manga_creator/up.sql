BEGIN TRANSACTION;
ALTER TABLE "public"."manga_creator" DROP CONSTRAINT "manga_creator_pkey";

ALTER TABLE "public"."manga_creator"
    ADD CONSTRAINT "manga_creator_pkey" PRIMARY KEY ("id");
COMMIT TRANSACTION;
