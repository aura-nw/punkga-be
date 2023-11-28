CREATE OR REPLACE FUNCTION public.quest_reward_claimed(quest_row quests)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
    SELECT count(0)
    FROM user_quest
    WHERE quest_id = quest_row.id
$function$