CREATE TABLE "public"."user_level" ("user_id" bpchar, "xp" integer NOT NULL DEFAULT 0, "level" integer NOT NULL DEFAULT 0, PRIMARY KEY ("user_id") , FOREIGN KEY ("user_id") REFERENCES "public"."authorizer_users"("id") ON UPDATE restrict ON DELETE restrict);