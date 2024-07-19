CREATE OR REPLACE FUNCTION public.main_wallet_address(user_row authorizer_users)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
    SELECT
        CASE
            WHEN user_row.wallet_address = '' THEN (SELECT address FROM user_wallet WHERE user_id = user_row.id)
            WHEN user_row.wallet_address IS NULL THEN (SELECT address FROM user_wallet WHERE user_id = user_row.id)
            ELSE user_row.wallet_address
        END AS main_address;
$function$;
