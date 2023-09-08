CREATE VIEW manga_total_views AS
  SELECT manga_id, sum(views) as views
    FROM chapters
    INNER JOIN manga m on chapters.manga_id = m.id
    GROUP BY manga_id;
