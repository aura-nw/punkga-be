CREATE OR REPLACE VIEW character_total_likes AS
 SELECT story_character_id, count(1)
    FROM likes
    GROUP BY story_character_id;
