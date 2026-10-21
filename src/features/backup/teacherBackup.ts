import type { Preparation, SavedPreparation } from '../preparation/model';
import { appEnv } from '../../shared/config/env';
import { supabase } from '../../shared/lib/supabase';
import {
  createTeacherSnapshot,
  parseTeacherSnapshot,
  restoreTeacherSnapshot,
} from '../../shared/domain/teacherSnapshot';
import type { TeacherSnapshot } from '../../shared/domain/teacherSnapshot';

export interface TeacherBackup extends TeacherSnapshot {
  updatedAt: string;
}

interface AuthDetails {
  accessToken: string;
  userId: string;
}

interface ClientOptions {
  apiUrl?: string;
  anonKey?: string;
  auth?: AuthDetails;
  fetcher?: typeof fetch;
}

export const isTeacherBackupConfigured = () => appEnv.isSupabaseConfigured;

function endpoint(options: ClientOptions): string {
  const base = (options.apiUrl ?? appEnv.supabaseUrl).trim();
  if (!base) throw new Error('Supabase 서버 주소가 아직 연결되지 않았어요.');
  const url = new URL('/rest/v1/teacher_expeditions', base);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('로그인 보호를 위해 HTTPS 서버 주소를 사용해 주세요.');
  return url.toString();
}

async function authDetails(options: ClientOptions): Promise<AuthDetails> {
  if (options.auth) return options.auth;
  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_TEST_BYPASS === 'true')
    return {
      accessToken: 'e2e-test-session',
      userId: '00000000-0000-4000-8000-000000000001',
    };
  if (!supabase) throw new Error('Supabase 로그인이 아직 연결되지 않았어요.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('교사 로그인이 필요해요.');
  return {
    accessToken: data.session.access_token,
    userId: data.session.user.id,
  };
}

function requestHeaders(options: ClientOptions, auth: AuthDetails) {
  const anonKey = (options.anonKey ?? appEnv.supabaseAnonKey).trim();
  if (!anonKey) throw new Error('Supabase 공개 키가 아직 연결되지 않았어요.');
  return {
    apikey: anonKey,
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
  };
}

function parseBackupRow(value: unknown): TeacherBackup {
  if (
    !value ||
    typeof value !== 'object' ||
    !('snapshot' in value) ||
    !('updated_at' in value) ||
    typeof value.updated_at !== 'string' ||
    !Number.isFinite(Date.parse(value.updated_at))
  )
    throw new Error('서버 백업 응답을 확인해 주세요.');
  return { ...parseTeacherSnapshot(value.snapshot), updatedAt: value.updated_at };
}

async function serverError(response: Response): Promise<never> {
  if (response.status === 401)
    throw new Error('교사 로그인이 만료됐어요. 다시 로그인해 주세요.');
  if (response.status === 403)
    throw new Error('이 교사 계정으로 접근할 수 없는 원정이에요.');
  if (response.status === 413)
    throw new Error('원정 자료가 너무 커서 저장하지 못했어요.');
  if (response.status === 400) throw new Error('저장할 원정 자료를 다시 확인해 주세요.');
  throw new Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
}

export async function saveTeacherBackup(
  plan: Preparation,
  options: ClientOptions = {},
): Promise<TeacherBackup> {
  const auth = await authDetails(options);
  const snapshot = createTeacherSnapshot(plan);
  const url = new URL(endpoint(options));
  url.searchParams.set('on_conflict', 'owner_id,expedition_id');
  const response = await (options.fetcher ?? fetch)(url, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      ...requestHeaders(options, auth),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      owner_id: auth.userId,
      expedition_id: plan.id,
      snapshot,
    }),
  });
  if (!response.ok) return serverError(response);
  const value: unknown = await response.json();
  if (!Array.isArray(value) || value.length !== 1)
    throw new Error('서버 백업 응답을 확인해 주세요.');
  return parseBackupRow(value[0]);
}

export async function listTeacherBackups(
  options: ClientOptions = {},
): Promise<TeacherBackup[]> {
  const auth = await authDetails(options);
  const url = new URL(endpoint(options));
  url.searchParams.set('select', 'snapshot,updated_at');
  url.searchParams.set('order', 'updated_at.desc');
  url.searchParams.set('limit', '200');
  const response = await (options.fetcher ?? fetch)(url, {
    method: 'GET',
    credentials: 'omit',
    headers: requestHeaders(options, auth),
  });
  if (!response.ok) return serverError(response);
  const value: unknown = await response.json();
  if (!Array.isArray(value) || value.length > 200)
    throw new Error('서버 백업 목록을 확인해 주세요.');
  return value.map(parseBackupRow);
}

export function restoreTeacherBackups(backups: TeacherBackup[]): SavedPreparation[] {
  let result: SavedPreparation[] = [];
  backups
    .slice()
    .sort((left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt))
    .forEach((backup) => {
      result = restoreTeacherSnapshot(backup, backup.updatedAt);
    });
  return result;
}
