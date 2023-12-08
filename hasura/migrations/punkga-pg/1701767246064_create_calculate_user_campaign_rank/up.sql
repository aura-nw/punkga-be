CREATE OR REPLACE FUNCTION public.calculate_user_campaign_rank(user_campaign_row user_campaign)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
    SELECT rank FROM (
        SELECT
          user_campaign.user_id,
          user_campaign.total_reward_xp,
          rank() OVER (
            ORDER BY
              user_campaign.total_reward_xp DESC,
              user_campaign.updated_at
      ) AS rank,
      user_campaign.updated_at
    FROM
      user_campaign
    INNER JOIN user_level ul on user_campaign.user_id = ul.user_id
        WHERE campaign_id = user_campaign_row.campaign_id) as user_campaign_rank
        WHERE user_id = user_campaign_row.user_id;
$function$;
