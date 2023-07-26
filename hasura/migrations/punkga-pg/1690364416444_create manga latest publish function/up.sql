CREATE OR REPLACE FUNCTION latest_published(manga_row manga) RETURNS 
timestamp with time zone 
AS $$
    SELECT pushlish_date
    FROM chapters
    WHERE chapters.manga_id = manga_row.id AND chapters.status = 'Published'
	ORDER BY pushlish_date DESC NULLS LAST
	LIMIT 1
$$ LANGUAGE sql STABLE;
