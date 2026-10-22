create table if not exists public.student_team_purchase_reversals (
  reversal_id uuid primary key,
  owner_id uuid not null,
  expedition_id uuid not null,
  request_id uuid not null references public.student_team_purchases(request_id)
    on delete restrict,
  reason text not null check (char_length(trim(reason)) between 3 and 200),
  reversed_at timestamptz not null default now(),
  unique (owner_id, expedition_id, request_id),
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade
);

alter table public.student_team_purchase_reversals enable row level security;
revoke all on public.student_team_purchase_reversals from public, anon, authenticated;
grant select, insert on public.student_team_purchase_reversals to service_role;

drop index if exists public.student_team_one_hint_per_season;

create or replace function public.reverse_student_team_purchase(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_request_id uuid,
  p_reversal_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_purchase public.student_team_purchases%rowtype;
  v_reversal public.student_team_purchase_reversals%rowtype;
  v_reason text := trim(p_reason);
begin
  if char_length(v_reason) not between 3 and 200 then
    raise exception 'Invalid reversal reason';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_id::text || p_expedition_id::text || p_request_id::text,
      0
    )
  );

  select * into v_purchase
  from public.student_team_purchases
  where request_id = p_request_id
    and owner_id = p_owner_id
    and expedition_id = p_expedition_id;
  if not found then raise exception 'Purchase not found'; end if;

  if exists (
    select 1 from public.final_battles
    where owner_id = p_owner_id
      and expedition_id = p_expedition_id
      and season_index = v_purchase.season_index
  ) then raise exception 'Season already closed'; end if;

  select * into v_reversal
  from public.student_team_purchase_reversals
  where owner_id = p_owner_id
    and expedition_id = p_expedition_id
    and request_id = p_request_id;

  if found then
    if v_reversal.reason <> v_reason then
      raise exception 'Reversal reason does not match';
    end if;
  else
    insert into public.student_team_purchase_reversals (
      reversal_id, owner_id, expedition_id, request_id, reason
    ) values (
      p_reversal_id, p_owner_id, p_expedition_id, p_request_id, v_reason
    ) returning * into v_reversal;
  end if;

  return jsonb_build_object(
    'reversalId', v_reversal.reversal_id,
    'requestId', v_reversal.request_id,
    'reason', v_reversal.reason,
    'reversedAt', v_reversal.reversed_at,
    'refundedPoints', v_purchase.price
  );
end;
$$;

create or replace function public.purchase_student_team_item(
  p_token uuid,
  p_request_id uuid,
  p_item_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_board public.student_boards%rowtype;
  v_account public.student_team_accounts%rowtype;
  v_existing public.student_team_purchases%rowtype;
  v_season_index integer;
  v_price integer;
  v_student_spent integer;
  v_balance integer;
begin
  if p_item_id not in ('UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04', 'BOSS_HINT')
  then raise exception 'Invalid shop item'; end if;
  v_price := case when p_item_id = 'BOSS_HINT' then 100 else 30 end;

  select * into v_board from public.student_boards where token = p_token;
  if not found or v_board.owner_id is null then
    raise exception 'Student board not found';
  end if;
  v_season_index := (v_board.payload->>'seasonNumber')::integer - 1;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_board.owner_id::text || v_board.publication_id::text ||
    v_board.team_index::text || v_season_index::text,
    0
  ));

  select * into v_existing from public.student_team_purchases
  where request_id = p_request_id;
  if found then
    if v_existing.owner_id <> v_board.owner_id
      or v_existing.expedition_id <> v_board.publication_id
      or v_existing.team_index <> v_board.team_index
      or v_existing.season_index <> v_season_index
      or v_existing.item_id <> p_item_id
    then raise exception 'Purchase request does not match'; end if;
    if exists (
      select 1 from public.student_team_purchase_reversals
      where owner_id = v_existing.owner_id
        and expedition_id = v_existing.expedition_id
        and request_id = v_existing.request_id
    ) then raise exception 'Purchase already reversed'; end if;
  else
    select * into v_account from public.student_team_accounts
    where owner_id = v_board.owner_id
      and expedition_id = v_board.publication_id
      and team_index = v_board.team_index
      and season_index = v_season_index
    for update;
    if not found then raise exception 'Team account not published'; end if;
    if exists (
      select 1 from public.final_battles
      where owner_id = v_board.owner_id
        and expedition_id = v_board.publication_id
        and season_index = v_season_index
    ) then raise exception 'Season already closed'; end if;
    if p_item_id = 'BOSS_HINT' and (
      v_account.base_hint_purchased or exists (
        select 1 from public.student_team_purchases purchase
        where purchase.owner_id = v_board.owner_id
          and purchase.expedition_id = v_board.publication_id
          and purchase.team_index = v_board.team_index
          and purchase.season_index = v_season_index
          and purchase.item_id = 'BOSS_HINT'
          and not exists (
            select 1 from public.student_team_purchase_reversals reversal
            where reversal.owner_id = purchase.owner_id
              and reversal.expedition_id = purchase.expedition_id
              and reversal.request_id = purchase.request_id
          )
      )
    ) then raise exception 'Hint already purchased'; end if;
    select coalesce(sum(purchase.price), 0) into v_student_spent
    from public.student_team_purchases purchase
    where purchase.owner_id = v_board.owner_id
      and purchase.expedition_id = v_board.publication_id
      and purchase.team_index = v_board.team_index
      and purchase.season_index = v_season_index
      and not exists (
        select 1 from public.student_team_purchase_reversals reversal
        where reversal.owner_id = purchase.owner_id
          and reversal.expedition_id = purchase.expedition_id
          and reversal.request_id = purchase.request_id
      );
    v_balance := v_account.earned_points - v_account.teacher_spent_points - v_student_spent;
    if v_balance < v_price then raise exception 'Insufficient points'; end if;
    insert into public.student_team_purchases (
      request_id, owner_id, expedition_id, team_index, season_index, item_id, price
    ) values (
      p_request_id, v_board.owner_id, v_board.publication_id,
      v_board.team_index, v_season_index, p_item_id, v_price
    ) returning * into v_existing;
  end if;

  select * into v_account from public.student_team_accounts
  where owner_id = v_existing.owner_id
    and expedition_id = v_existing.expedition_id
    and team_index = v_existing.team_index
    and season_index = v_existing.season_index;
  select coalesce(sum(purchase.price), 0) into v_student_spent
  from public.student_team_purchases purchase
  where purchase.owner_id = v_existing.owner_id
    and purchase.expedition_id = v_existing.expedition_id
    and purchase.team_index = v_existing.team_index
    and purchase.season_index = v_existing.season_index
    and not exists (
      select 1 from public.student_team_purchase_reversals reversal
      where reversal.owner_id = purchase.owner_id
        and reversal.expedition_id = purchase.expedition_id
        and reversal.request_id = purchase.request_id
    );

  return jsonb_build_object(
    'requestId', v_existing.request_id,
    'itemId', v_existing.item_id,
    'price', v_existing.price,
    'purchasedAt', v_existing.purchased_at,
    'balance', v_account.earned_points - v_account.teacher_spent_points - v_student_spent
  );
end;
$$;

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
  v_reward public.hero_reward_tokens%rowtype;
  v_reason text := trim(p_reason);
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  if char_length(v_reason) not between 3 and 200 then
    raise exception 'Invalid correction reason';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text || p_expedition_id::text || p_reward_id, 0)
  );

  select * into v_reward
  from public.hero_reward_tokens
  where owner_id = v_owner
    and expedition_id = p_expedition_id
    and reward_id = p_reward_id;
  if not found then raise exception 'Hero reward not found'; end if;
  if exists (
    select 1 from public.final_battles
    where owner_id = v_owner
      and expedition_id = p_expedition_id
      and season_index = v_reward.season_index
  ) then raise exception 'Season already closed'; end if;

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
  if exists (
    select 1 from public.hero_correction_ledger
    where owner_id = p_owner_id and expedition_id = p_expedition_id
      and reward_id = p_reward_id
  ) then raise exception 'Hero reward corrected'; end if;
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
  update public.hero_reward_tokens reward set revealed_at = v_time
  where reward.owner_id = p_owner_id
    and reward.expedition_id = p_expedition_id
    and reward.season_index = p_season_index
    and reward.hero_id is not null
    and reward.revealed_at is null
    and not exists (
      select 1 from public.hero_correction_ledger correction
      where correction.owner_id = reward.owner_id
        and correction.expedition_id = reward.expedition_id
        and correction.reward_id = reward.reward_id
    );
  return jsonb_build_object('revealedAt', v_time);
end;
$$;

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
  if p_slot not between 1 and 15 then raise exception 'Invalid hero slot'; end if;
  select * into v_board from public.student_boards where token = p_token;
  if not found or v_board.owner_id is null then
    raise exception 'Student board not found';
  end if;
  v_season_index := (v_board.payload->>'seasonNumber')::integer - 1;
  if v_season_index not between 0 and 4 then raise exception 'Invalid board season'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_board.owner_id::text || v_board.publication_id::text ||
    v_board.team_index::text || v_season_index::text || p_slot::text,
    0
  ));

  select * into v_reward
  from public.hero_reward_tokens reward
  where reward.owner_id = v_board.owner_id
    and reward.expedition_id = v_board.publication_id
    and reward.team_index = v_board.team_index
    and reward.season_index = v_season_index
    and not exists (
      select 1 from public.hero_correction_ledger correction
      where correction.owner_id = reward.owner_id
        and correction.expedition_id = reward.expedition_id
        and correction.reward_id = reward.reward_id
    )
  order by reward.achieved_at, reward.reward_id
  offset (p_slot - 1)
  limit 1
  for update;

  if not found then raise exception 'Hero reward not found'; end if;
  if v_reward.hero_id is null then raise exception 'Hero collection exhausted'; end if;
  if v_reward.revealed_at is null then
    update public.hero_reward_tokens set revealed_at = now() + interval '2.5 seconds'
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

revoke all on function public.reverse_student_team_purchase(uuid, uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.reverse_student_team_purchase(uuid, uuid, uuid, uuid, text)
to service_role;

revoke all on function public.purchase_student_team_item(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.purchase_student_team_item(uuid, uuid, text)
to service_role;

revoke all on function public.record_hero_correction(uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.record_hero_correction(uuid, uuid, text, text)
to authenticated;

revoke all on function public.reveal_hero_reward_authority(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.reveal_hero_reward_authority(uuid, uuid, text)
to service_role;

revoke all on function public.reveal_season_heroes_authority(uuid, uuid, integer)
from public, anon, authenticated;
grant execute on function public.reveal_season_heroes_authority(uuid, uuid, integer)
to service_role;

revoke all on function public.reveal_student_hero_authority(uuid, integer)
from public, anon, authenticated;
grant execute on function public.reveal_student_hero_authority(uuid, integer)
to service_role;
