create table if not exists public.official_matches (
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  match_id uuid not null,
  season_index smallint not null check (season_index between 0 and 4),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'confirmed' check (status in ('confirmed', 'voided')),
  confirmed_at timestamptz not null default now(),
  voided_at timestamptz,
  void_reason text,
  primary key (owner_id, expedition_id, match_id),
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade,
  check (
    (status = 'confirmed' and voided_at is null and void_reason is null)
    or
    (status = 'voided' and voided_at is not null and char_length(trim(void_reason)) between 3 and 200)
  )
);

create table if not exists public.team_point_ledger (
  entry_id bigint generated always as identity primary key,
  owner_id uuid not null,
  expedition_id uuid not null,
  match_id uuid not null,
  team_key text not null check (team_key ~ '^team-[0-3]$'),
  season_index smallint not null check (season_index between 0 and 4),
  amount integer not null check (amount between -1000 and 1000 and amount <> 0),
  entry_type text not null check (entry_type in ('match_award', 'match_reversal')),
  created_at timestamptz not null default now(),
  foreign key (owner_id, expedition_id, match_id)
    references public.official_matches(owner_id, expedition_id, match_id),
  unique (owner_id, expedition_id, match_id, team_key, entry_type)
);

alter table public.official_matches enable row level security;
alter table public.team_point_ledger enable row level security;

grant select on public.official_matches, public.team_point_ledger to authenticated;
revoke insert, update, delete on public.official_matches, public.team_point_ledger
from anon, authenticated;
revoke all on public.official_matches, public.team_point_ledger from anon;

create policy "teachers read their official matches"
on public.official_matches for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "teachers read their point ledger"
on public.team_point_ledger for select to authenticated
using ((select auth.uid()) = owner_id);

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
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;
  if p_season_index not between 0 and 4 then
    raise exception 'Invalid season';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid match payload';
  end if;
  if jsonb_typeof(p_awards) <> 'array' or jsonb_array_length(p_awards) not between 2 and 4 then
    raise exception 'Invalid awards';
  end if;
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = v_owner and expedition_id = p_expedition_id
  ) then
    raise exception 'Expedition not found';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_awards) as award
    where jsonb_typeof(award) <> 'object'
      or coalesce(award->>'teamKey', '') !~ '^team-[0-3]$'
      or jsonb_typeof(award->'points') <> 'number'
      or (award->>'points')::numeric <> trunc((award->>'points')::numeric)
      or (award->>'points')::integer not between 1 and 1000
  ) or (
    select count(*) <> count(distinct award->>'teamKey')
    from jsonb_array_elements(p_awards) as award
  ) then
    raise exception 'Invalid awards';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || p_expedition_id::text || p_match_id::text, 0)
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
  else
    insert into public.official_matches (
      owner_id, expedition_id, match_id, season_index, payload
    ) values (
      v_owner, p_expedition_id, p_match_id, p_season_index::smallint, p_payload
    ) returning * into v_match;

    for v_award in select value from jsonb_array_elements(p_awards) loop
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
  end if;

  return jsonb_build_object(
    'matchId', v_match.match_id,
    'confirmedAt', v_match.confirmed_at
  );
end;
$$;

create or replace function public.void_official_match(
  p_expedition_id uuid,
  p_match_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_match public.official_matches%rowtype;
  v_reason text := trim(p_reason);
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;
  if char_length(v_reason) not between 3 and 200 then
    raise exception 'Invalid void reason';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || p_expedition_id::text || p_match_id::text, 0)
  );
  select * into v_match
  from public.official_matches
  where owner_id = v_owner
    and expedition_id = p_expedition_id
    and match_id = p_match_id
  for update;

  if not found then
    raise exception 'Official match not found';
  end if;

  if v_match.status = 'confirmed' then
    update public.official_matches
    set status = 'voided', voided_at = now(), void_reason = v_reason
    where owner_id = v_owner
      and expedition_id = p_expedition_id
      and match_id = p_match_id
    returning * into v_match;

    insert into public.team_point_ledger (
      owner_id,
      expedition_id,
      match_id,
      team_key,
      season_index,
      amount,
      entry_type
    )
    select
      owner_id,
      expedition_id,
      match_id,
      team_key,
      season_index,
      -amount,
      'match_reversal'
    from public.team_point_ledger
    where owner_id = v_owner
      and expedition_id = p_expedition_id
      and match_id = p_match_id
      and entry_type = 'match_award';
  end if;

  return jsonb_build_object(
    'matchId', v_match.match_id,
    'confirmedAt', v_match.confirmed_at,
    'voidedAt', v_match.voided_at,
    'voidReason', v_match.void_reason
  );
end;
$$;

revoke all on function public.confirm_official_match(uuid, uuid, integer, jsonb, jsonb)
from public, anon;
grant execute on function public.confirm_official_match(uuid, uuid, integer, jsonb, jsonb)
to authenticated;

revoke all on function public.void_official_match(uuid, uuid, text)
from public, anon;
grant execute on function public.void_official_match(uuid, uuid, text)
to authenticated;
