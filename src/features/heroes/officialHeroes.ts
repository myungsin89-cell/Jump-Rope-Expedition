import type { Preparation } from '../preparation/model';
import { supabase } from '../../shared/lib/supabase';
import { isUuid } from '../../shared/domain/studentBoard';

export interface OfficialHeroCorrectionMutation {
  correctionId: string;
  rewardId: string;
  correctedAt: string;
}

let testBypass = false;
export function setHeroTestBypass(value: boolean) {
  testBypass = value;
}

export function isHeroTestBypass() {
  return testBypass;
}

function serverMessage(raw: string): string {
  if (raw.includes('Authentication required'))
    return '교사 로그인이 만료됐어요. 다시 로그인해 주세요.';
  if (raw.includes('Expedition not found'))
    return '원정 정보를 찾을 수 없어요. 원정 목록을 다시 열어 주세요.';
  if (raw.includes('Invalid correction reason'))
    return '회수 사유를 3자 이상 200자 이내로 입력해 주세요.';
  if (raw.includes('Correction reason does not match'))
    return '이미 다른 사유로 회수 처리된 요청이에요.';
  if (raw.includes('Hero reward not found'))
    return '서버 영웅 기록을 찾지 못했어요. 먼저 서버 동기화를 확인해 주세요.';
  if (raw.includes('Season already closed'))
    return '최종 대전이 확정된 시즌의 영웅은 회수할 수 없어요.';
  return '영웅 회수 서버 기록에 실패했어요. 네트워크 상태를 확인해 주세요.';
}

export async function recordOfficialHeroCorrection(
  plan: Preparation,
  rewardId: string,
  requestId: string,
  reason: string,
): Promise<OfficialHeroCorrectionMutation | null> {
  const cleanReason = reason.trim();
  if (cleanReason.length < 3 || cleanReason.length > 200)
    throw new Error('회수 사유를 3자 이상 200자 이내로 입력해 주세요.');

  if (testBypass) {
    return {
      correctionId: requestId,
      rewardId,
      correctedAt: new Date().toISOString(),
    };
  }
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return null;

  const correctionId = isUuid(requestId) ? requestId : crypto.randomUUID();

  const { data, error } = await supabase.rpc('record_hero_correction', {
    p_expedition_id: plan.id,
    p_correction_id: correctionId,
    p_reward_id: rewardId,
    p_reason: cleanReason,
  });

  if (error) throw new Error(serverMessage(error.message));

  return {
    correctionId: (data as { correctionId?: string })?.correctionId ?? correctionId,
    rewardId: (data as { rewardId?: string })?.rewardId ?? rewardId,
    correctedAt:
      (data as { correctedAt?: string })?.correctedAt ?? new Date().toISOString(),
  };
}
