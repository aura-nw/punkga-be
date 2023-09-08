CREATE OR REPLACE FUNCTION nearest_upcoming(manga_row manga) RETURNS 
timestamp with time zone 
AS $$
    SELECT pushlish_date
    FROM chapters
    WHERE chapters.manga_id = manga_row.id AND chapters.status = 'Upcoming' AND chapters.pushlish_date > now()
	ORDER BY pushlish_date ASC NULLS LAST
	LIMIT 1
$$ LANGUAGE sql STABLE;
