CREATE OR REPLACE VIEW "public"."top_user_donate" AS 
 SELECT 
    telegram_users.username,
    telegram_users.user_id,
    donate_history.telegram_id,
    sum(donate_history.value) AS value
   FROM donate_history
 INNER JOIN telegram_users on telegram_users.telegram_id = donate_history.telegram_id
 GROUP BY telegram_users.username,telegram_users.user_id,donate_history.telegram_id
 LIMIT 10;
