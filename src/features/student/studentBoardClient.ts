import type { HeroStore } from '../heroes/model';
import type { Preparation } from '../preparation/model';
import { isUuid } from '../../shared/domain/studentBoard';
import { supabase } from '../../shared/lib/supabase';

export interface SharedLink {
  teamIndex: number;
  teamName: string;
  token: string;
}

export const studentLinksKey = (expeditionId: string) =>
  `jre.student-links.v1.${expeditionId}`;

export function readStudentLinks(expeditionId: string): SharedLink[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(studentLinksKey(expeditionId)) ?? '[]',
    );
    return Array.isArray(value)
      ? value.filter(
          (item): item is SharedLink =>
            Boolean(item) &&
            Number.isInteger(item.teamIndex) &&
            item.teamIndex >= 0 &&
            item.teamIndex < 4 &&
            typeof item.teamName === 'string' &&
            isUuid(item.token),
        )
      : [];
  } catch {
    return [];
  }
}

export async function publishStudentBoards(
  plan: Preparation,
  heroes: HeroStore,
  rotate: boolean,
  signal?: AbortSignal,
): Promise<SharedLink[]> {
  const apiUrl = import.meta.env.VITE_BOARD_API_URL?.trim();
  if (!apiUrl) throw new Error('학생 화면 서버가 아직 연결되지 않았어요.');
  const endpoint = new URL(apiUrl);
  if (
    endpoint.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(endpoint.hostname)
  )
    throw new Error('로그인 보호를 위해 HTTPS 서버 주소를 사용해 주세요.');
  if (!supabase) throw new Error('Supabase 로그인이 아직 연결되지 않았어요.');
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !data.session)
    throw new Error('교사 로그인이 만료됐어요. 다시 로그인해 주세요.');
  const response = await fetch(apiUrl, {
    method: 'POST',
    credentials: 'omit',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action: 'publish', plan, heroes, rotate }),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? '교사 로그인이 만료됐어요. 다시 로그인해 주세요.'
        : '게시하지 못했어요. 서버 설정과 네트워크를 확인해 주세요.',
    );
  const value: unknown = await response.json();
  if (
    !value ||
    typeof value !== 'object' ||
    !('links' in value) ||
    !Array.isArray(value.links)
  )
    throw new Error('서버 응답을 확인해 주세요.');
  const links = value.links.filter(
    (item): item is SharedLink =>
      Boolean(item) &&
      isUuid(item.token) &&
      Number.isInteger(item.teamIndex) &&
      typeof item.teamName === 'string',
  );
  if (
    links.length !== plan.teams.length ||
    new Set(links.map((item) => item.teamIndex)).size !== plan.teams.length ||
    links.some((item) => item.teamIndex < 0 || item.teamIndex >= plan.teams.length)
  )
    throw new Error('모든 원정대의 링크를 받지 못했어요. 다시 게시해 주세요.');
  try {
    localStorage.setItem(studentLinksKey(plan.id), JSON.stringify(links));
  } catch {
    /* The server publish succeeded; the caller can still display the returned links. */
  }
  return links;
}

export async function syncPublishedStudentBoards(
  plan: Preparation,
  heroes: HeroStore,
): Promise<boolean> {
  if (!import.meta.env.VITE_BOARD_API_URL?.trim()) return false;
  if (readStudentLinks(plan.id).length !== plan.teams.length) return false;
  await publishStudentBoards(plan, heroes, false);
  return true;
}
