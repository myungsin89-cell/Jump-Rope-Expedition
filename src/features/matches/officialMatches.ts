import type { MatchPreview } from '../../shared/domain/matchScoring';
import { supabase } from '../../shared/lib/supabase';
import type { Preparation } from '../preparation/model';
import type { PracticeDraft } from './practiceModel';

interface OfficialMutation {
  matchId: string;
  confirmedAt: string;
  voidedAt?: string;
  voidReason?: string;
}

const testBypass =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_TEST_BYPASS === 'true';

function parseMutation(value: unknown): OfficialMutation {
  if (!value || typeof value !== 'object')
    throw new Error('공식 경기 서버 응답을 확인해 주세요.');
  const record = value as Record<string, unknown>;
  if (
    typeof record.matchId !== 'string' ||
    !record.matchId ||
    typeof record.confirmedAt !== 'string' ||
    !Number.isFinite(Date.parse(record.confirmedAt)) ||
    (record.voidedAt !== undefined &&
      (typeof record.voidedAt !== 'string' ||
        !Number.isFinite(Date.parse(record.voidedAt)))) ||
    (record.voidReason !== undefined && typeof record.voidReason !== 'string')
  )
    throw new Error('공식 경기 서버 응답을 확인해 주세요.');
  return record as unknown as OfficialMutation;
}

function serverMessage(message: string) {
  const value = message.toLowerCase();
  if (value.includes('already voided')) return '이미 취소된 경기 기록이에요.';
  if (value.includes('payload does not match'))
    return '같은 경기 번호로 다른 결과가 이미 저장되어 있어요.';
  if (value.includes('fourth-place'))
    return '4위 순위 포인트가 아직 정해지지 않아 이 결과를 확정할 수 없어요.';
  if (value.includes('award calculation does not match'))
    return '서버의 직전 공식 경기와 포인트 계산이 달라요. 현황에서 서버 자료를 다시 불러온 뒤 시도해 주세요.';
  if (value.includes('invalid match') || value.includes('invalid awards'))
    return '경기 입력값을 서버에서 확인하지 못했어요. 기록을 다시 확인해 주세요.';
  if (value.includes('expedition not found'))
    return '원정 자료를 서버에 먼저 저장해 주세요.';
  if (value.includes('jwt') || value.includes('auth'))
    return '교사 로그인이 만료됐어요. 다시 로그인해 주세요.';
  return '공식 경기 서버에 연결하지 못했어요. 입력 내용은 보관되어 있어요.';
}

export function officialAwards(results: MatchPreview[]) {
  if (results.some((result) => result.estimatedPoints === null))
    throw new Error('4위 순위 포인트가 미정이라 경기 결과를 확정할 수 없어요.');
  return results.map((result) => ({
    teamKey: result.teamKey,
    points: result.estimatedPoints!,
  }));
}

export async function confirmOfficialMatch(
  plan: Preparation,
  draft: PracticeDraft,
  results: MatchPreview[],
): Promise<OfficialMutation> {
  const awards = officialAwards(results);
  if (testBypass)
    return {
      matchId: draft.id,
      confirmedAt: new Date().toISOString(),
    };
  if (!supabase) throw new Error('Supabase 공식 경기 서버가 연결되지 않았어요.');
  const { data, error } = await supabase.rpc('confirm_official_match', {
    p_expedition_id: plan.id,
    p_match_id: draft.id,
    p_season_index: draft.seasonIndex,
    p_payload: { version: 1, draft, results },
    p_awards: awards,
  });
  if (error) throw new Error(serverMessage(error.message));
  return parseMutation(data);
}

export async function voidOfficialMatch(
  expeditionId: string,
  matchId: string,
  reason: string,
): Promise<OfficialMutation> {
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 200)
    throw new Error('취소 사유를 3자 이상 200자 이내로 입력해 주세요.');
  if (testBypass)
    return {
      matchId,
      confirmedAt: new Date().toISOString(),
      voidedAt: new Date().toISOString(),
      voidReason: cleanReason,
    };
  if (!supabase) throw new Error('Supabase 공식 경기 서버가 연결되지 않았어요.');
  const { data, error } = await supabase.rpc('void_official_match', {
    p_expedition_id: expeditionId,
    p_match_id: matchId,
    p_reason: cleanReason,
  });
  if (error) throw new Error(serverMessage(error.message));
  return parseMutation(data);
}
