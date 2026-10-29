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
  if v_match_count < 1
  then raise exception 'Official match count does not match'; end if;

  -- The official ledger is authoritative. A teacher can finish the season even
  -- when another device has already awarded a match that is absent locally.
  p_input := pg_catalog.jsonb_set(
    p_input,
    '{matchCount}',
    pg_catalog.to_jsonb(v_match_count),
    true
  );
  p_result := pg_catalog.jsonb_set(
    p_result,
    '{matchCount}',
    pg_catalog.to_jsonb(v_match_count),
    true
  );

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

revoke all on function public.store_final_battle_authority(uuid, uuid, integer, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.store_final_battle_authority(uuid, uuid, integer, text, text, jsonb, jsonb) to service_role;
