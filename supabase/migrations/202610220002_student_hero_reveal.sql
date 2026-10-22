create or replace function public.reveal_student_hero_authority(
  p_token uuid,
  p_slot integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board public.student_boards%rowtype;
  v_reward public.hero_reward_tokens%rowtype;
  v_season_index integer;
begin
  if p_slot not between 1 and 15 then
    raise exception 'Invalid hero slot';
  end if;

  select * into v_board
  from public.student_boards
  where token = p_token;
  if not found or v_board.owner_id is null then
    raise exception 'Student board not found';
  end if;

  v_season_index := (v_board.payload->>'seasonNumber')::integer - 1;
  if v_season_index not between 0 and 4 then
    raise exception 'Invalid board season';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_board.owner_id::text || v_board.publication_id::text ||
    v_board.team_index::text || v_season_index::text || p_slot::text,
    0
  ));

  select * into v_reward
  from public.hero_reward_tokens
  where owner_id = v_board.owner_id
    and expedition_id = v_board.publication_id
    and team_index = v_board.team_index
    and season_index = v_season_index
  order by achieved_at, reward_id
  offset (p_slot - 1)
  limit 1
  for update;

  if not found then
    raise exception 'Hero reward not found';
  end if;
  if v_reward.hero_id is null then
    raise exception 'Hero collection exhausted';
  end if;

  if v_reward.revealed_at is null then
    update public.hero_reward_tokens
    set revealed_at = now() + interval '2.5 seconds'
    where owner_id = v_reward.owner_id
      and expedition_id = v_reward.expedition_id
      and achievement_id = v_reward.achievement_id
    returning * into v_reward;
  end if;

  return jsonb_build_object(
    'eventId', v_reward.reward_id,
    'slot', p_slot,
    'heroId', v_reward.hero_id,
    'startedAt', v_reward.revealed_at
  );
end;
$$;

revoke all on function public.reveal_student_hero_authority(uuid, integer)
from public, anon, authenticated;
grant execute on function public.reveal_student_hero_authority(uuid, integer)
to service_role;
