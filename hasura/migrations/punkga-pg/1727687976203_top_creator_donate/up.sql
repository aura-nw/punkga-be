CREATE OR REPLACE VIEW "public"."top_creator_donate" AS 
 SELECT creators.id,
    creators.email,
    creators.name,
    creators.avatar_url,
    sum(donate_history.value) AS value
   FROM (donate_history
     JOIN creators ON ((creators.id = donate_history.creator_id)))
  GROUP BY creators.id, creators.email, creators.name, creators.avatar_url;