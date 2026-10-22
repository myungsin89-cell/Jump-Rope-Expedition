create table if not exists public.medal_awards (
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  award_id uuid not null,
  medal_id text not null,
  student_id text not null,
  student_name text not null,
  team_key text not null check (team_key ~ '^team-[0-3]$'),
  team_name text not null,
  season_index smallint not null check (season_index between 0 and 4),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  awarded_at timestamptz not null default now(),
  primary key (owner_id, expedition_id, award_id),
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade
);

create table if not exists public.medal_point_ledger (
  entry_id bigint generated always as identity primary key,
  owner_id uuid not null,
  expedition_id uuid not null,
  award_id uuid not null,
  team_key text not null check (team_key ~ '^team-[0-3]$'),
  season_index smallint not null check (season_index between 0 and 4),
  amount integer not null default 10 check (amount = 10),
  created_at timestamptz not null default now(),
  foreign key (owner_id, expedition_id, award_id)
    references public.medal_awards(owner_id, expedition_id, award_id)
    on delete cascade,
  unique (owner_id, expedition_id, award_id)
);

alter table public.medal_awards enable row level security;
alter table public.medal_point_ledger enable row level security;

grant select on public.medal_awards, public.medal_point_ledger to authenticated;
revoke insert, update, delete on public.medal_awards, public.medal_point_ledger
from anon, authenticated;
revoke all on public.medal_awards, public.medal_point_ledger from anon;

create policy "teachers read their medal awards"
on public.medal_awards for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "teachers read their medal point ledger"
on public.medal_point_ledger for select to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.record_medal_award(
  p_expedition_id uuid,
  p_award_id uuid,
  p_medal_id text,
  p_student_id text,
  p_student_name text,
  p_team_key text,
  p_team_name text,
  p_season_index integer,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_award public.medal_awards%rowtype;
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;
  if p_season_index not between 0 and 4 then
    raise exception 'Invalid season';
  end if;
  if p_team_key !~ '^team-[0-3]$' then
    raise exception 'Invalid team key';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid medal payload';
  end if;
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = v_owner and expedition_id = p_expedition_id
  ) then
    raise exception 'Expedition not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || p_expedition_id::text || p_award_id::text, 0)
  );

  select * into v_award
  from public.medal_awards
  where owner_id = v_owner
    and expedition_id = p_expedition_id
    and award_id = p_award_id;

  if found then
    if v_award.medal_id <> p_medal_id
      or v_award.student_id <> p_student_id
      or v_award.team_key <> p_team_key
      or v_award.season_index <> p_season_index
    then
      raise exception 'Award payload does not match';
    end if;
  else
    insert into public.medal_awards (
      owner_id, expedition_id, award_id, medal_id, student_id, student_name,
      team_key, team_name, season_index, payload
    ) values (
      v_owner, p_expedition_id, p_award_id, p_medal_id, p_student_id, p_student_name,
      p_team_key, p_team_name, p_season_index::smallint, p_payload
    ) returning * into v_award;

    insert into public.medal_point_ledger (
      owner_id, expedition_id, award_id, team_key, season_index, amount
    ) values (
      v_owner, p_expedition_id, p_award_id, p_team_key, p_season_index::smallint, 10
    );
  end if;

  return jsonb_build_object(
    'awardId', v_award.award_id,
    'awardedAt', v_award.awarded_at
  );
end;
$$;

revoke all on function public.record_medal_award(uuid, uuid, text, text, text, text, text, integer, jsonb)
from public, anon, authenticated;
grant execute on function public.record_medal_award(uuid, uuid, text, text, text, text, text, integer, jsonb)
to authenticated;
