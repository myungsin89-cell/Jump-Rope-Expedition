create extension if not exists pgcrypto with schema extensions;

create table if not exists public.hero_reward_tokens (
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  achievement_id text not null check (char_length(achievement_id) between 1 and 300),
  reward_id text not null check (char_length(reward_id) between 1 and 320),
  mission_id text not null check (mission_id in (
    'FIVE_STEPS', 'SHINING_CHALLENGE', 'SHINING_COMPANIONS',
    'STEADY_STEPS', 'COMEBACK', 'FOUR_FORCES'
  )),
  team_index smallint not null check (team_index between 0 and 3),
  season_index smallint not null check (season_index between 0 and 4),
  hero_id text check (hero_id is null or hero_id ~ '^H(0[1-9]|1[0-5])$'),
  achieved_at timestamptz not null,
  created_at timestamptz not null default now(),
  revealed_at timestamptz,
  contributors jsonb not null default '{"ids":[],"names":[]}'::jsonb
    check (jsonb_typeof(contributors) = 'object'),
  primary key (owner_id, expedition_id, achievement_id),
  unique (owner_id, expedition_id, reward_id),
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade,
  check (hero_id is not null or revealed_at is null)
);

create unique index if not exists hero_reward_tokens_unique_season_hero
on public.hero_reward_tokens (owner_id, expedition_id, team_index, season_index, hero_id)
where hero_id is not null;

create table if not exists public.final_battles (
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  season_index smallint not null check (season_index between 0 and 4),
  request_key text not null check (char_length(request_key) between 1 and 300),
  rule_version text not null check (rule_version = 'battle-v1'),
  input_payload jsonb not null check (jsonb_typeof(input_payload) = 'object'),
  result_payload jsonb not null check (jsonb_typeof(result_payload) = 'object'),
  status text not null default 'calculated' check (status in ('calculated', 'finished')),
  calculated_at timestamptz not null,
  finished_at timestamptz,
  primary key (owner_id, expedition_id, season_index),
  unique (owner_id, expedition_id, request_key),
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade,
  check (
    (status = 'calculated' and finished_at is null)
    or (status = 'finished' and finished_at is not null)
  )
);

alter table public.hero_reward_tokens enable row level security;
alter table public.final_battles enable row level security;

grant select on public.hero_reward_tokens, public.final_battles to authenticated;
revoke insert, update, delete on public.hero_reward_tokens, public.final_battles
from anon, authenticated;
revoke all on public.hero_reward_tokens, public.final_battles from anon;

create policy "teachers read their hero rewards"
on public.hero_reward_tokens for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "teachers read their final battles"
on public.final_battles for select to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.claim_hero_reward_authority(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_achievement_id text,
  p_reward_id text,
  p_mission_id text,
  p_team_index integer,
  p_season_index integer,
  p_achieved_at timestamptz,
  p_revealed_at timestamptz,
  p_legacy_hero_id text,
  p_contributor_ids text[],
  p_contributor_names text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.hero_reward_tokens%rowtype;
  v_common text[] := array['H01','H02','H03','H04','H05','H06','H07','H08'];
  v_rare text[] := array['H09','H10','H11','H12','H13'];
  v_legendary text[] := array['H14','H15'];
  v_common_available text[];
  v_rare_available text[];
  v_legendary_available text[];
  v_total_weight integer := 0;
  v_roll double precision;
  v_pool text[];
  v_hero text;
  v_bytes bytea;
begin
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = p_owner_id and expedition_id = p_expedition_id
  ) then raise exception 'Expedition not found'; end if;
  if char_length(p_achievement_id) not between 1 and 300
    or char_length(p_reward_id) not between 1 and 320
    or p_mission_id not in (
      'FIVE_STEPS', 'SHINING_CHALLENGE', 'SHINING_COMPANIONS',
      'STEADY_STEPS', 'COMEBACK', 'FOUR_FORCES'
    )
    or p_team_index not between 0 and 3
    or p_season_index not between 0 and 4
    or cardinality(p_contributor_ids) <> cardinality(p_contributor_names)
    or cardinality(p_contributor_ids) > 30
  then raise exception 'Invalid hero achievement'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_owner_id::text || p_expedition_id::text || p_team_index::text || p_season_index::text, 0
  ));
  select * into v_existing from public.hero_reward_tokens
  where owner_id = p_owner_id and expedition_id = p_expedition_id
    and achievement_id = p_achievement_id;
  if found then
    if v_existing.reward_id <> p_reward_id
      or v_existing.mission_id <> p_mission_id
      or v_existing.team_index <> p_team_index
      or v_existing.season_index <> p_season_index
    then raise exception 'Hero achievement payload does not match'; end if;
    return jsonb_build_object(
      'rewardId', v_existing.reward_id,
      'achievementId', v_existing.achievement_id,
      'heroId', v_existing.hero_id,
      'awardedAt', v_existing.achieved_at,
      'revealedAt', v_existing.revealed_at
    );
  end if;

  if p_revealed_at is not null then
    if p_legacy_hero_id is null or p_legacy_hero_id !~ '^H(0[1-9]|1[0-5])$'
      or exists (
        select 1 from public.hero_reward_tokens r
        where r.owner_id = p_owner_id and r.expedition_id = p_expedition_id
          and r.team_index = p_team_index and r.season_index = p_season_index
          and r.hero_id = p_legacy_hero_id
      )
    then raise exception 'Invalid legacy hero'; end if;
    v_hero := p_legacy_hero_id;
  end if;

  select array_agg(hero order by hero) into v_common_available
  from unnest(v_common) hero where not exists (
    select 1 from public.hero_reward_tokens r
    where r.owner_id = p_owner_id and r.expedition_id = p_expedition_id
      and r.team_index = p_team_index and r.season_index = p_season_index
      and r.hero_id = hero
  );
  select array_agg(hero order by hero) into v_rare_available
  from unnest(v_rare) hero where not exists (
    select 1 from public.hero_reward_tokens r
    where r.owner_id = p_owner_id and r.expedition_id = p_expedition_id
      and r.team_index = p_team_index and r.season_index = p_season_index
      and r.hero_id = hero
  );
  select array_agg(hero order by hero) into v_legendary_available
  from unnest(v_legendary) hero where not exists (
    select 1 from public.hero_reward_tokens r
    where r.owner_id = p_owner_id and r.expedition_id = p_expedition_id
      and r.team_index = p_team_index and r.season_index = p_season_index
      and r.hero_id = hero
  );
  if cardinality(v_common_available) > 0 then v_total_weight := v_total_weight + 60; end if;
  if cardinality(v_rare_available) > 0 then v_total_weight := v_total_weight + 30; end if;
  if cardinality(v_legendary_available) > 0 then v_total_weight := v_total_weight + 10; end if;

  if v_hero is null and v_total_weight > 0 then
    v_bytes := extensions.gen_random_bytes(4);
    v_roll := (
      get_byte(v_bytes, 0)::double precision * 16777216
      + get_byte(v_bytes, 1)::double precision * 65536
      + get_byte(v_bytes, 2)::double precision * 256
      + get_byte(v_bytes, 3)::double precision
    ) / 4294967296.0 * v_total_weight;
    if cardinality(v_common_available) > 0 and v_roll < 60 then
      v_pool := v_common_available;
    else
      if cardinality(v_common_available) > 0 then v_roll := v_roll - 60; end if;
      if cardinality(v_rare_available) > 0 and v_roll < 30 then
        v_pool := v_rare_available;
      else
        v_pool := v_legendary_available;
      end if;
    end if;
    select hero into v_hero from unnest(v_pool) hero
    order by extensions.gen_random_uuid() limit 1;
  end if;

  insert into public.hero_reward_tokens (
    owner_id, expedition_id, achievement_id, reward_id, mission_id,
    team_index, season_index, hero_id, achieved_at, revealed_at, contributors
  ) values (
    p_owner_id, p_expedition_id, p_achievement_id, p_reward_id, p_mission_id,
    p_team_index, p_season_index, v_hero, p_achieved_at,
    case when v_hero is null then null else p_revealed_at end,
    jsonb_build_object('ids', to_jsonb(p_contributor_ids), 'names', to_jsonb(p_contributor_names))
  ) returning * into v_existing;

  return jsonb_build_object(
    'rewardId', v_existing.reward_id,
    'achievementId', v_existing.achievement_id,
    'heroId', v_existing.hero_id,
    'awardedAt', v_existing.achieved_at,
    'revealedAt', v_existing.revealed_at
  );
end;
$$;

create or replace function public.reveal_hero_reward_authority(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_reward_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_reward public.hero_reward_tokens%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_owner_id::text || p_expedition_id::text || p_reward_id, 0
  ));
  select * into v_reward from public.hero_reward_tokens
  where owner_id = p_owner_id and expedition_id = p_expedition_id
    and reward_id = p_reward_id for update;
  if not found then raise exception 'Hero reward not found'; end if;
  if v_reward.hero_id is null then raise exception 'Hero collection exhausted'; end if;
  if v_reward.revealed_at is null then
    update public.hero_reward_tokens set revealed_at = now() + interval '2.5 seconds'
    where owner_id = p_owner_id and expedition_id = p_expedition_id
      and reward_id = p_reward_id returning * into v_reward;
  end if;
  return jsonb_build_object(
    'rewardId', v_reward.reward_id,
    'heroId', v_reward.hero_id,
    'teamIndex', v_reward.team_index,
    'seasonIndex', v_reward.season_index,
    'revealedAt', v_reward.revealed_at
  );
end;
$$;

create or replace function public.reveal_season_heroes_authority(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_season_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_time timestamptz := now();
begin
  if p_season_index not between 0 and 4 then raise exception 'Invalid season'; end if;
  update public.hero_reward_tokens set revealed_at = v_time
  where owner_id = p_owner_id and expedition_id = p_expedition_id
    and season_index = p_season_index and hero_id is not null and revealed_at is null;
  return jsonb_build_object('revealedAt', v_time);
end;
$$;

create or replace function public.store_final_battle_authority(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_season_index integer,
  p_request_key text,
  p_rule_version text,
  p_input jsonb,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.final_battles%rowtype;
  v_match_count integer;
begin
  if p_season_index not between 0 and 4 or p_rule_version <> 'battle-v1'
    or char_length(p_request_key) not between 1 and 300
    or jsonb_typeof(p_input) <> 'object' or jsonb_typeof(p_result) <> 'object'
  then raise exception 'Invalid battle request'; end if;
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = p_owner_id and expedition_id = p_expedition_id
  ) then raise exception 'Expedition not found'; end if;
  select count(*) into v_match_count from public.official_matches
  where owner_id = p_owner_id and expedition_id = p_expedition_id
    and season_index = p_season_index and status = 'confirmed';
  if v_match_count < 1 or v_match_count <> (p_input->>'matchCount')::integer
  then raise exception 'Official match count does not match'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    p_owner_id::text || p_expedition_id::text || p_season_index::text, 0
  ));
  select * into v_existing from public.final_battles
  where owner_id = p_owner_id and expedition_id = p_expedition_id
    and season_index = p_season_index;
  if found then
    if v_existing.request_key <> p_request_key or v_existing.input_payload <> p_input
    then raise exception 'Battle already calculated with different input'; end if;
    return v_existing.result_payload;
  end if;
  insert into public.final_battles (
    owner_id, expedition_id, season_index, request_key, rule_version,
    input_payload, result_payload, calculated_at
  ) values (
    p_owner_id, p_expedition_id, p_season_index, p_request_key, p_rule_version,
    p_input, p_result, (p_result->>'calculatedAt')::timestamptz
  ) returning * into v_existing;
  return v_existing.result_payload;
end;
$$;

create or replace function public.finish_final_battle_authority(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_season_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_battle public.final_battles%rowtype;
begin
  select * into v_battle from public.final_battles
  where owner_id = p_owner_id and expedition_id = p_expedition_id
    and season_index = p_season_index for update;
  if not found then raise exception 'Final battle not found'; end if;
  if v_battle.status = 'calculated' then
    update public.final_battles set status = 'finished', finished_at = now()
    where owner_id = p_owner_id and expedition_id = p_expedition_id
      and season_index = p_season_index returning * into v_battle;
  end if;
  return jsonb_build_object('finishedAt', v_battle.finished_at);
end;
$$;

revoke all on function public.claim_hero_reward_authority(uuid, uuid, text, text, text, integer, integer, timestamptz, timestamptz, text, text[], text[]) from public, anon, authenticated;
revoke all on function public.reveal_hero_reward_authority(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reveal_season_heroes_authority(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.store_final_battle_authority(uuid, uuid, integer, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.finish_final_battle_authority(uuid, uuid, integer) from public, anon, authenticated;

grant execute on function public.claim_hero_reward_authority(uuid, uuid, text, text, text, integer, integer, timestamptz, timestamptz, text, text[], text[]) to service_role;
grant execute on function public.reveal_hero_reward_authority(uuid, uuid, text) to service_role;
grant execute on function public.reveal_season_heroes_authority(uuid, uuid, integer) to service_role;
grant execute on function public.store_final_battle_authority(uuid, uuid, integer, text, text, jsonb, jsonb) to service_role;
grant execute on function public.finish_final_battle_authority(uuid, uuid, integer) to service_role;
