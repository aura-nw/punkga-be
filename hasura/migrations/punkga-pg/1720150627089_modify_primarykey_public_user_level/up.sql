BEGIN TRANSACTION;
ALTER TABLE "public"."user_level" DROP CONSTRAINT "user_level_pkey";

ALTER TABLE "public"."user_level"
    ADD CONSTRAINT "user_level_pkey" PRIMARY KEY ("user_id", "chain_id");
COMMIT TRANSACTION;
