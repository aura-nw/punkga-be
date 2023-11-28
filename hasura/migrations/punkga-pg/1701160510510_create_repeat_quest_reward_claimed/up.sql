CREATE OR REPLACE FUNCTION public.repeat_quest_reward_claimed(repeat_quest_row repeat_quests)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
    SELECT count(0)
    FROM user_quest
    WHERE repeat_quest_id = repeat_quest_row.id
$function$;
