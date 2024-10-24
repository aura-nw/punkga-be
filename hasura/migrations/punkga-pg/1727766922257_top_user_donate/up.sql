CREATE OR REPLACE VIEW "public"."top_user_donate" AS 
 SELECT
    username,
    user_id,
    telegram_id,
    value,
    ROW_NUMBER() OVER(ORDER BY value DESC) AS ranking
FROM(
 SELECT telegram_users.username,
    telegram_users.user_id,
    donate_history.telegram_id,
    sum(donate_history.value) AS value
 FROM (donate_history
     JOIN telegram_users ON ((telegram_users.telegram_id = donate_history.telegram_id)))
  GROUP BY telegram_users.username, telegram_users.user_id, donate_history.telegram_id
  ) top_user_donate;
