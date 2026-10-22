import type { Preparation } from '../preparation/model';
import type { MedalAward } from './model';
import { supabase } from '../../shared/lib/supabase';
import { isUuid } from '../../shared/domain/studentBoard';

export interface OfficialMedalMutation {
  awardId: string;
  awardedAt: string;
}

let testBypass = false;
export function setMedalTestBypass(value: boolean) {
  testBypass = value;
}

export function isMedalTestBypass() {
  return testBypass;
}

function serverMessage(raw: string): string {
  if (raw.includes('Authentication required'))
    return '교사 로그인이 만료됐어요. 다시 로그인해 주세요.';
  if (raw.includes('Expedition not found'))
    return '원정 정보를 찾을 수 없어요. 원정 목록을 다시 열어 주세요.';
  if (raw.includes('Invalid season'))
    return '기록할 시즌을 먼저 준비해 주세요.';
  if (raw.includes('Invalid team key'))
    return '원정대 편성을 확인해 주세요.';
  if (raw.includes('Award payload does not match'))
    return '이미 다른 내용으로 처리된 훈장 수여 요청이에요.';
  return '훈장 서버 기록에 실패했어요. 네트워크 상태를 확인해 주세요.';
}

export async function recordOfficialMedalAward(
  plan: Preparation,
  award: MedalAward,
): Promise<OfficialMedalMutation | null> {
  if (testBypass) {
    return {
      awardId: award.id,
      awardedAt: award.awardedAt,
    };
  }
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return null;

  // Ensure award.id is a valid UUID for the database
  const awardId = isUuid(award.id) ? award.id : crypto.randomUUID();

  const { data, error } = await supabase.rpc('record_medal_award', {
    p_expedition_id: plan.id,
    p_award_id: awardId,
    p_medal_id: award.medalId,
    p_student_id: award.studentId,
    p_student_name: award.studentName,
    p_team_key: award.teamKey,
    p_team_name: award.teamName,
    p_season_index: award.seasonIndex,
    p_payload: {
      medal: award.medal,
      actor: award.actor,
    },
  });

  if (error) throw new Error(serverMessage(error.message));

  return {
    awardId: (data as { awardId?: string })?.awardId ?? awardId,
    awardedAt: (data as { awardedAt?: string })?.awardedAt ?? award.awardedAt,
  };
}
