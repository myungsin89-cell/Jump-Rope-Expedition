import { battleKey } from '../battle/model';
import { economyKey } from '../economy/model';
import { heroKey } from '../heroes/model';
import { practiceKey } from '../matches/practiceModel';
import { medalKey } from '../medals/model';
import { readPreparations, SAVED_KEY } from '../preparation/model';
import type { Preparation, SavedPreparation } from '../preparation/model';
import {
  createTeacherSnapshot,
  parseTeacherSnapshot,
} from '../../shared/domain/teacherSnapshot';
import type { TeacherSnapshot } from '../../shared/domain/teacherSnapshot';

export const LOCAL_BACKUP_KIND = 'jump-rope-expedition-backup';

export interface LocalExpeditionBackup {
  kind: typeof LOCAL_BACKUP_KIND;
  version: 1;
  exportedAt: string;
  snapshot: TeacherSnapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function createLocalBackup(
  plan: Preparation,
  exportedAt = new Date().toISOString(),
): LocalExpeditionBackup {
  if (!Number.isFinite(Date.parse(exportedAt)))
    throw new Error('백업 저장 시간을 확인해 주세요.');
  return {
    kind: LOCAL_BACKUP_KIND,
    version: 1,
    exportedAt,
    snapshot: createTeacherSnapshot(plan),
  };
}

export function parseLocalBackup(value: unknown): LocalExpeditionBackup {
  if (
    !isRecord(value) ||
    value.kind !== LOCAL_BACKUP_KIND ||
    value.version !== 1 ||
    typeof value.exportedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.exportedAt))
  )
    throw new Error('줄넘기 원정대 백업 파일인지 확인해 주세요.');
  return {
    kind: LOCAL_BACKUP_KIND,
    version: 1,
    exportedAt: value.exportedAt,
    snapshot: parseTeacherSnapshot(value.snapshot),
  };
}

export function parseLocalBackupText(text: string): LocalExpeditionBackup {
  try {
    return parseLocalBackup(JSON.parse(text));
  } catch (reason) {
    if (reason instanceof SyntaxError)
      throw new Error('백업 파일을 읽을 수 없어요. JSON 파일인지 확인해 주세요.', {
        cause: reason,
      });
    throw reason;
  }
}

export function serializeLocalBackup(plan: Preparation): string {
  return JSON.stringify(createLocalBackup(plan), null, 2);
}

export function localBackupFilename(plan: Preparation, date = new Date()): string {
  const label = (plan.className.trim() || '우리 반 원정')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  const day = Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : 'backup';
  return `줄넘기원정대_${label}_${day}.json`;
}

export function restoreLocalBackup(
  value: unknown,
  restoredAt = new Date().toISOString(),
): SavedPreparation[] {
  if (!Number.isFinite(Date.parse(restoredAt)))
    throw new Error('복원 시간을 확인해 주세요.');
  const backup = parseLocalBackup(value);
  const snapshot = backup.snapshot;
  let current: SavedPreparation[] = [];
  try {
    current = readPreparations();
  } catch {
    // A valid backup must still be able to recover a damaged preparation index.
  }
  const saved: SavedPreparation = { ...snapshot.plan, savedAt: restoredAt };
  const next = [saved, ...current.filter((plan) => plan.id !== saved.id)];
  const writes: Array<[string, string]> = [
    [practiceKey(saved.id), JSON.stringify(snapshot.practice)],
    [medalKey(saved.id), JSON.stringify(snapshot.medals)],
    [economyKey(saved.id), JSON.stringify(snapshot.economy)],
    [heroKey(saved.id), JSON.stringify(snapshot.heroes)],
    [battleKey(saved.id), JSON.stringify(snapshot.battles)],
    [SAVED_KEY, JSON.stringify(next)],
  ];
  const previous = new Map(writes.map(([key]) => [key, localStorage.getItem(key)]));
  try {
    writes.forEach(([key, raw]) => localStorage.setItem(key, raw));
  } catch {
    [...writes].reverse().forEach(([key]) => {
      try {
        const raw = previous.get(key);
        if (raw === null || raw === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, raw);
      } catch {
        // Best-effort rollback after a browser storage failure.
      }
    });
    throw new Error(
      '백업을 복원하지 못했어요. 기존 자료는 유지했으니 브라우저 저장 공간을 확인해 주세요.',
    );
  }
  return next;
}
