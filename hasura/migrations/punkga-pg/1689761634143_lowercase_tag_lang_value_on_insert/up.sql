CREATE OR REPLACE FUNCTION lowercase_tag_lang_value_on_insert() RETURNS trigger AS $lowercase_tag_lang_value_on_insert$
    BEGIN        
        NEW.value = LOWER(NEW.value);
        RETURN NEW;
    END;
$lowercase_tag_lang_value_on_insert$ LANGUAGE plpgsql;

CREATE TRIGGER lowercase_tag_lang_value_on_insert BEFORE INSERT OR UPDATE ON tag_languages
    FOR EACH ROW EXECUTE PROCEDURE lowercase_tag_lang_value_on_insert();
