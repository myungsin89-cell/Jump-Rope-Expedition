create table if not exists public.student_team_accounts (
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  team_index smallint not null check (team_index between 0 and 3),
  season_index smallint not null check (season_index between 0 and 4),
  earned_points integer not null check (earned_points between 0 and 10000000),
  teacher_spent_points integer not null check (
    teacher_spent_points between 0 and earned_points
  ),
  base_inventory jsonb not null check (jsonb_typeof(base_inventory) = 'object'),
  base_hint_purchased boolean not null default false,
  hint_text text not null check (char_length(hint_text) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (owner_id, expedition_id, team_index, season_index),
  foreign key (owner_id, expedition_id)
    references public.teacher_expeditions(owner_id, expedition_id)
    on delete cascade
);

create table if not exists public.student_team_purchases (
  request_id uuid primary key,
  owner_id uuid not null,
  expedition_id uuid not null,
  team_index smallint not null check (team_index between 0 and 3),
  season_index smallint not null check (season_index between 0 and 4),
  item_id text not null check (
    item_id in ('UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04', 'BOSS_HINT')
  ),
  price integer not null check (price in (30, 100)),
  purchased_at timestamptz not null default now(),
  foreign key (owner_id, expedition_id, team_index, season_index)
    references public.student_team_accounts(owner_id, expedition_id, team_index, season_index)
    on delete restrict
);

create unique index if not exists student_team_one_hint_per_season
on public.student_team_purchases (owner_id, expedition_id, team_index, season_index, item_id)
where item_id = 'BOSS_HINT';

alter table public.student_team_accounts enable row level security;
alter table public.student_team_purchases enable row level security;
revoke all on public.student_team_accounts, public.student_team_purchases
from public, anon, authenticated;
grant select, insert, update, delete
on public.student_team_accounts, public.student_team_purchases to service_role;

create or replace function public.sync_student_team_accounts(
  p_owner_id uuid,
  p_expedition_id uuid,
  p_accounts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account jsonb;
  v_inventory jsonb;
  v_count integer := 0;
begin
  if not exists (
    select 1 from public.teacher_expeditions
    where owner_id = p_owner_id and expedition_id = p_expedition_id
  ) then raise exception 'Expedition not found'; end if;
  if jsonb_typeof(p_accounts) <> 'array'
    or jsonb_array_length(p_accounts) not between 2 and 4
  then raise exception 'Invalid team accounts'; end if;
  if (
    select count(*) <> count(distinct (account->>'teamIndex')::integer)
    from jsonb_array_elements(p_accounts) account
  ) then raise exception 'Duplicate team accounts'; end if;

  for v_account in select value from jsonb_array_elements(p_accounts) loop
    v_inventory := v_account->'inventory';
    if jsonb_typeof(v_account) <> 'object'
      or (v_account->>'teamIndex')::integer not between 0 and 3
      or (v_account->>'seasonIndex')::integer not between 0 and 4
      or (v_account->>'earnedPoints')::integer not between 0 and 10000000
      or (v_account->>'teacherSpentPoints')::integer not between 0 and
        (v_account->>'earnedPoints')::integer
      or jsonb_typeof(v_inventory) <> 'object'
      or (v_inventory->>'UNIT_01')::integer not between 0 and 100000
      or (v_inventory->>'UNIT_02')::integer not between 0 and 100000
      or (v_inventory->>'UNIT_03')::integer not between 0 and 100000
      or (v_inventory->>'UNIT_04')::integer not between 0 and 100000
      or jsonb_typeof(v_account->'hintPurchased') <> 'boolean'
      or char_length(v_account->>'hintText') not between 1 and 500
    then raise exception 'Invalid team account'; end if;

    insert into public.student_team_accounts as existing (
      owner_id, expedition_id, team_index, season_index,
      earned_points, teacher_spent_points, base_inventory,
      base_hint_purchased, hint_text
    ) values (
      p_owner_id,
      p_expedition_id,
      (v_account->>'teamIndex')::smallint,
      (v_account->>'seasonIndex')::smallint,
      (v_account->>'earnedPoints')::integer,
      (v_account->>'teacherSpentPoints')::integer,
      v_inventory,
      (v_account->>'hintPurchased')::boolean,
      v_account->>'hintText'
    )
    on conflict (owner_id, expedition_id, team_index, season_index)
    do update set
      earned_points = excluded.earned_points,
      teacher_spent_points = excluded.teacher_spent_points,
      base_inventory = excluded.base_inventory,
      base_hint_purchased = excluded.base_hint_purchased,
      hint_text = excluded.hint_text,
      updated_at = now();
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('teamCount', v_count);
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
        select 1 from public.student_team_purchases
        where owner_id = v_board.owner_id
          and expedition_id = v_board.publication_id
          and team_index = v_board.team_index
          and season_index = v_season_index
          and item_id = 'BOSS_HINT'
      )
    ) then raise exception 'Hint already purchased'; end if;
    select coalesce(sum(price), 0) into v_student_spent
    from public.student_team_purchases
    where owner_id = v_board.owner_id
      and expedition_id = v_board.publication_id
      and team_index = v_board.team_index
      and season_index = v_season_index;
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
  select coalesce(sum(price), 0) into v_student_spent
  from public.student_team_purchases
  where owner_id = v_existing.owner_id
    and expedition_id = v_existing.expedition_id
    and team_index = v_existing.team_index
    and season_index = v_existing.season_index;

  return jsonb_build_object(
    'requestId', v_existing.request_id,
    'itemId', v_existing.item_id,
    'price', v_existing.price,
    'purchasedAt', v_existing.purchased_at,
    'balance', v_account.earned_points - v_account.teacher_spent_points - v_student_spent
  );
end;
$$;

revoke all on function public.sync_student_team_accounts(uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.purchase_student_team_item(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.sync_student_team_accounts(uuid, uuid, jsonb)
to service_role;
grant execute on function public.purchase_student_team_item(uuid, uuid, text)
to service_role;
