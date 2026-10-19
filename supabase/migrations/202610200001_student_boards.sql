-- Single-owner preparation pilot. No student/client direct table access.
create table if not exists public.classroom_preparations (
  id uuid primary key,
  preparation jsonb not null check (jsonb_typeof(preparation) = 'object'),
  updated_at timestamptz not null default now()
);
create table if not exists public.student_boards (
  publication_id uuid not null references public.classroom_preparations(id),
  team_index smallint not null check (team_index between 0 and 3),
  token uuid not null default gen_random_uuid() unique,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (publication_id, team_index)
);
alter table public.classroom_preparations enable row level security;
alter table public.student_boards enable row level security;
revoke all on public.classroom_preparations, public.student_boards from public, anon, authenticated;
grant select, insert, update, delete on public.classroom_preparations, public.student_boards to service_role;

create or replace function public.publish_student_boards(p_publication_id uuid, p_preparation jsonb, p_boards jsonb, p_rotate boolean default false)
returns table (team_index smallint, token uuid, payload jsonb)
language plpgsql security invoker set search_path = '' as $$
declare board jsonb;
begin
  if jsonb_typeof(p_boards) <> 'array' or jsonb_array_length(p_boards) not between 2 and 4 then
    raise exception 'Invalid board count';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_publication_id::text, 0));
  insert into public.classroom_preparations (id, preparation) values (p_publication_id, p_preparation)
  on conflict (id) do update set preparation = excluded.preparation, updated_at = now();
  for board in select value from jsonb_array_elements(p_boards) loop
    insert into public.student_boards as existing_board (publication_id, team_index, payload)
    values (p_publication_id, (board->>'teamIndex')::smallint, board)
    on conflict on constraint student_boards_pkey do update
      set payload = excluded.payload, updated_at = now(), token = case when p_rotate then gen_random_uuid() else existing_board.token end;
  end loop;
  delete from public.student_boards b where b.publication_id = p_publication_id and b.team_index >= jsonb_array_length(p_boards);
  return query select b.team_index, b.token, b.payload from public.student_boards b where b.publication_id = p_publication_id order by b.team_index;
end;
$$;
revoke all on function public.publish_student_boards(uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.publish_student_boards(uuid, jsonb, jsonb, boolean) to service_role;
