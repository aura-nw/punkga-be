CREATE OR REPLACE FUNCTION public.main_wallet_address_by_chain(user_row authorizer_users, chain integer)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
    SELECT
        CASE
        WHEN personal_address IS NULL THEN (SELECT custodial_address)
        ELSE personal_address
        END AS active_address
    FROM (SELECT cwa.address as custodial_address, upw.address as personal_address FROM authorizer_users au
    INNER JOIN custodial_wallet_address cwa on au.id = cwa.user_id
    LEFT JOIN user_personal_wallet upw on au.id = upw.user_id and cwa.chain_id = upw.chain_id
        WHERE au.id = user_row.id AND cwa.chain_id = chain) user_wallets;
$function$;