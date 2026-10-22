create table if not exists public.hero_correction_ledger (
  correction_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  reward_id text not null check (char_length(reward_id) between 1 and 320),
  reason text not null check (char_length(trim(reason)) between 3 and 200),
  corrected_at timestamptz not null default now(),
  actor text not null default 'local-teacher',
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade,
  unique (owner_id, expedition_id, reward_id)
);

alter table public.hero_correction_ledger enable row level security;

grant select on public.hero_correction_ledger to authenticated;
revoke insert, update, delete on public.hero_correction_ledger from anon, authenticated;
revoke all on public.hero_correction_ledger from anon;

create policy "teachers read their hero correction ledger"
on public.hero_correction_ledger for select to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.record_hero_correction(
  p_expedition_id uuid,
  p_correction_id uuid,
  p_reward_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_correction public.hero_correction_ledger%rowtype;
  v_reason text := trim(p_reason);
begin
  if v_owner is null then
    raise exception 'Authentication required';
  end if;
  if char_length(v_reason) not between 3 and 200 then
    raise exception 'Invalid correction reason';
  end if;
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = v_owner and expedition_id = p_expedition_id
  ) then
    raise exception 'Expedition not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || p_expedition_id::text || p_reward_id, 0)
  );

  select * into v_correction
  from public.hero_correction_ledger
  where owner_id = v_owner
    and expedition_id = p_expedition_id
    and reward_id = p_reward_id;

  if found then
    if v_correction.reason <> v_reason then
      raise exception 'Correction reason does not match';
    end if;
  else
    insert into public.hero_correction_ledger (
      correction_id, owner_id, expedition_id, reward_id, reason
    ) values (
      p_correction_id, v_owner, p_expedition_id, p_reward_id, v_reason
    ) returning * into v_correction;
  end if;

  return jsonb_build_object(
    'correctionId', v_correction.correction_id,
    'rewardId', v_correction.reward_id,
    'correctedAt', v_correction.corrected_at
  );
end;
$$;

revoke all on function public.record_hero_correction(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.record_hero_correction(uuid, uuid, text, text)
to authenticated;
