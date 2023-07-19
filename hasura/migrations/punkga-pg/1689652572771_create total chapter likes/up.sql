CREATE VIEW chapter_total_likes AS
  SELECT chapter_id, count(1)
    FROM likes
    GROUP BY chapter_id;
