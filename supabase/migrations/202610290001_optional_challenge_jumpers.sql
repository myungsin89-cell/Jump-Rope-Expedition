create or replace function public.confirm_official_match(
  p_expedition_id uuid,
  p_match_id uuid,
  p_season_index integer,
  p_payload jsonb,
  p_awards jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_match public.official_matches%rowtype;
  v_award jsonb;
  v_expected jsonb;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;
  if p_season_index not between 0 and 4 then
    raise exception 'Invalid season';
  end if;
  if jsonb_typeof(p_payload) <> 'object'
    or p_payload#>>'{draft,id}' <> p_match_id::text
    or p_payload#>>'{draft,classId}' <> p_expedition_id::text
    or coalesce(p_payload#>>'{draft,seasonIndex}', '') !~ '^[0-4]$'
    or (p_payload#>>'{draft,seasonIndex}')::integer <> p_season_index
    or p_payload#>>'{draft,locked}' <> 'true'
  then
    raise exception 'Invalid match payload';
  end if;
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = v_owner and expedition_id = p_expedition_id
  ) then
    raise exception 'Expedition not found';
  end if;

  -- Serialize confirmations for one expedition so two different match IDs cannot
  -- calculate from the same season-best snapshot at the same time.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || p_expedition_id::text || ':official-match', 0)
  );
  select * into v_match
  from public.official_matches
  where owner_id = v_owner
    and expedition_id = p_expedition_id
    and match_id = p_match_id;

  if found then
    if v_match.status = 'voided' then
      raise exception 'Match already voided';
    end if;
    if v_match.payload <> p_payload or v_match.season_index <> p_season_index then
      raise exception 'Match payload does not match';
    end if;
    return jsonb_build_object(
      'matchId', v_match.match_id,
      'confirmedAt', v_match.confirmed_at
    );
  end if;

  if p_payload->>'scoringVersion' <> 'growth-v2' then
    raise exception 'Growth scoring v2 required';
  end if;
  if jsonb_typeof(p_payload#>'{draft,teams}') <> 'array'
    or jsonb_array_length(p_payload#>'{draft,teams}') not between 2 and 4
    or jsonb_typeof(p_awards) <> 'array'
    or jsonb_array_length(p_awards) <> jsonb_array_length(p_payload#>'{draft,teams}')
  then
    raise exception 'Invalid match teams';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload#>'{draft,teams}') as team
    where jsonb_typeof(team) <> 'object'
      or coalesce(team->>'key', '') !~ '^team-[0-3]$'
      or coalesce(team->>'raw', '') !~ '^\d{1,15}$'
      or jsonb_typeof(team->'jumpers') <> 'array'
  ) or (
    select count(*) <> count(distinct team->>'key')
    from jsonb_array_elements(p_payload#>'{draft,teams}') as team
  ) then
    raise exception 'Invalid match teams';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload#>'{draft,teams}') as team
    where jsonb_array_length(team->'jumpers') not between 0 and 2
  ) then
    raise exception 'Invalid match jumpers';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload#>'{draft,teams}') as team
    cross join lateral jsonb_array_elements(team->'jumpers') as jumper
    where jsonb_typeof(jumper) <> 'object'
      or coalesce(jumper->>'studentId', '') = ''
      or jsonb_typeof(jumper->'multiplier') <> 'number'
      or (jumper->>'multiplier')::numeric <> trunc((jumper->>'multiplier')::numeric)
      or (jumper->>'multiplier')::integer not between 1 and 3
      or coalesce(jumper->>'actual', '') !~ '^\d{1,15}$'
      or (jumper->>'actual')::numeric > (team->>'raw')::numeric
  ) or (
    select count(*) <> count(distinct jumper->>'studentId')
    from jsonb_array_elements(p_payload#>'{draft,teams}') as team
    cross join lateral jsonb_array_elements(team->'jumpers') as jumper
  ) then
    raise exception 'Invalid match jumpers';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_awards) as award
    where jsonb_typeof(award) <> 'object'
      or coalesce(award->>'teamKey', '') !~ '^team-[0-3]$'
      or jsonb_typeof(award->'points') <> 'number'
      or (award->>'points')::numeric <> trunc((award->>'points')::numeric)
      or (award->>'points')::integer not between 20 and 65
  ) or (
    select count(*) <> count(distinct award->>'teamKey')
    from jsonb_array_elements(p_awards) as award
  ) then
    raise exception 'Invalid awards';
  end if;

  with current_teams as (
    select
      team->>'key' as team_key,
      (team->>'raw')::numeric as raw_count,
      (team->>'raw')::numeric
        + coalesce(
            sum(
              (jumper->>'actual')::numeric
              * ((jumper->>'multiplier')::integer - 1)
            ),
            0
          ) as ranking_count
    from jsonb_array_elements(p_payload#>'{draft,teams}') as team
    left join lateral jsonb_array_elements(team->'jumpers') as jumper on true
    group by team->>'key', team->>'raw'
  ), ranked as (
    select
      team.*,
      1 + (
        select count(*)
        from current_teams other
        where other.ranking_count > team.ranking_count
      ) as place
    from current_teams team
  ), expected as (
    select
      ranked.team_key,
      20
      + case ranked.place
          when 1 then 15
          when 2 then 10
          when 3 then 5
          when 4 then 0
          else null
        end
      + case
          when previous.raw_count is null then 10
          when ranked.raw_count > previous.raw_count
            and (
              previous.raw_count = 0
              or ranked.raw_count * 100 >= previous.raw_count * 105
            ) then 30
          when ranked.raw_count > previous.raw_count then 20
          when ranked.raw_count * 100 >= previous.raw_count * 95 then 10
          else 0
        end as points
    from ranked
    left join lateral (
      select max((prior_team->>'raw')::numeric) as raw_count
      from public.official_matches prior
      cross join lateral jsonb_array_elements(prior.payload#>'{draft,teams}') as prior_team
      where prior.owner_id = v_owner
        and prior.expedition_id = p_expedition_id
        and prior.match_id <> p_match_id
        and prior.season_index = p_season_index
        and prior.status = 'confirmed'
        and prior_team->>'key' = ranked.team_key
    ) previous on true
  )
  select jsonb_agg(
    jsonb_build_object('teamKey', team_key, 'points', points)
    order by team_key
  ) into v_expected
  from expected;

  if exists (
    select 1 from jsonb_array_elements(v_expected) as expected
    where expected->'points' = 'null'::jsonb
  ) then
    raise exception 'Invalid calculated rank';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_expected) as expected
    left join lateral (
      select award
      from jsonb_array_elements(p_awards) as award
      where award->>'teamKey' = expected->>'teamKey'
      limit 1
    ) supplied on true
    where supplied.award is null
      or (supplied.award->>'points')::integer <> (expected->>'points')::integer
  ) then
    raise exception 'Award calculation does not match';
  end if;

  insert into public.official_matches (
    owner_id, expedition_id, match_id, season_index, payload
  ) values (
    v_owner, p_expedition_id, p_match_id, p_season_index::smallint, p_payload
  ) returning * into v_match;

  for v_award in select value from jsonb_array_elements(v_expected) loop
    insert into public.team_point_ledger (
      owner_id,
      expedition_id,
      match_id,
      team_key,
      season_index,
      amount,
      entry_type
    ) values (
      v_owner,
      p_expedition_id,
      p_match_id,
      v_award->>'teamKey',
      p_season_index::smallint,
      (v_award->>'points')::integer,
      'match_award'
    );
  end loop;

  return jsonb_build_object(
    'matchId', v_match.match_id,
    'confirmedAt', v_match.confirmed_at
  );
end;
$$;

revoke all on function public.confirm_official_match(uuid, uuid, integer, jsonb, jsonb)
from anon;
grant execute on function public.confirm_official_match(uuid, uuid, integer, jsonb, jsonb)
to authenticated;


