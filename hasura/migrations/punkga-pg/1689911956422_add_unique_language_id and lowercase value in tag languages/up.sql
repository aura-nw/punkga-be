DROP TRIGGER IF EXISTS lowercase_tag_lang_value_on_insert ON tag_languages;

DROP FUNCTION IF EXISTS lowercase_tag_lang_value_on_insert;

CREATE UNIQUE INDEX IF NOT EXISTS tag_languagues_language_id_lower_value_key 
   ON tag_languages (lower(value), language_id);
