create table if not exists public.teacher_expeditions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  expedition_id uuid not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (owner_id, expedition_id)
);

alter table public.teacher_expeditions enable row level security;
grant select, insert, update, delete on public.teacher_expeditions to authenticated;
revoke all on public.teacher_expeditions from anon;

create policy "teachers read their expeditions"
on public.teacher_expeditions for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "teachers create their expeditions"
on public.teacher_expeditions for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "teachers update their expeditions"
on public.teacher_expeditions for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "teachers delete their expeditions"
on public.teacher_expeditions for delete to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.touch_teacher_expedition()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teacher_expeditions_touch_updated_at
before update on public.teacher_expeditions
for each row execute function public.touch_teacher_expedition();

alter table public.classroom_preparations
add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.student_boards
add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create or replace function public.publish_student_boards_v2(
  p_owner_id uuid,
  p_publication_id uuid,
  p_preparation jsonb,
  p_boards jsonb,
  p_rotate boolean default false
)
returns table (team_index smallint, token uuid, payload jsonb)
language plpgsql security invoker set search_path = '' as $$
declare board jsonb;
declare existing_owner uuid;
begin
  if jsonb_typeof(p_boards) <> 'array' or jsonb_array_length(p_boards) not between 2 and 4 then
    raise exception 'Invalid board count';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_publication_id::text, 0));
  select owner_id into existing_owner from public.classroom_preparations where id = p_publication_id;
  if existing_owner is not null and existing_owner <> p_owner_id then
    raise exception 'Publication belongs to another owner';
  end if;
  insert into public.classroom_preparations (id, owner_id, preparation)
  values (p_publication_id, p_owner_id, p_preparation)
  on conflict (id) do update
    set owner_id = p_owner_id, preparation = excluded.preparation, updated_at = now();
  for board in select value from jsonb_array_elements(p_boards) loop
    insert into public.student_boards as existing_board
      (publication_id, owner_id, team_index, payload)
    values
      (p_publication_id, p_owner_id, (board->>'teamIndex')::smallint, board)
    on conflict on constraint student_boards_pkey do update
      set owner_id = p_owner_id,
          payload = excluded.payload,
          updated_at = now(),
          token = case when p_rotate then gen_random_uuid() else existing_board.token end;
  end loop;
  delete from public.student_boards b
  where b.publication_id = p_publication_id
    and b.team_index >= jsonb_array_length(p_boards);
  return query
    select b.team_index, b.token, b.payload
    from public.student_boards b
    where b.publication_id = p_publication_id and b.owner_id = p_owner_id
    order by b.team_index;
end;
$$;

revoke all on function public.publish_student_boards_v2(uuid, uuid, jsonb, jsonb, boolean)
from public, anon, authenticated;
grant execute on function public.publish_student_boards_v2(uuid, uuid, jsonb, jsonb, boolean)
to service_role;
