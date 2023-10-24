CREATE OR REPLACE VIEW user_xp_rank AS
  select
  user_id,
  xp,
  level,
  rank() over (order by xp desc, updated_at asc) as rank
from user_level;
