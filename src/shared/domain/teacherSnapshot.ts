import { economyKey, parseEconomyStore, readEconomy } from '../../features/economy/model';
import type { EconomyStore } from '../../features/economy/model';
import {
  parsePracticeStore,
  practiceKey,
  readPracticeStore,
} from '../../features/matches/practiceModel';
import type { PracticeStore } from '../../features/matches/practiceModel';
import { medalKey, parseMedalStore, readMedals } from '../../features/medals/model';
import type { MedalStore } from '../../features/medals/model';
import {
  mergeServerPreparations,
  readPreparations,
} from '../../features/preparation/model';
import type { Preparation, SavedPreparation } from '../../features/preparation/model';
import { parseTeacherPreparation } from './studentBoard';

export interface TeacherSnapshot {
  version: 1;
  plan: Preparation;
  practice: PracticeStore;
  medals: MedalStore;
  economy: EconomyStore;
}

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

export function createTeacherSnapshot(plan: Preparation): TeacherSnapshot {
  return {
    version: 1,
    plan: parseTeacherPreparation(plan),
    practice: readPracticeStore(plan.id),
    medals: readMedals(plan.id),
    economy: readEconomy(plan.id),
  };
}

export function parseTeacherSnapshot(value: unknown): TeacherSnapshot {
  if (!object(value) || value.version !== 1)
    throw new Error('서버 원정 자료 형식을 확인해 주세요.');
  const plan = parseTeacherPreparation(value.plan);
  return {
    version: 1,
    plan,
    practice: parsePracticeStore(value.practice, plan.id),
    medals: parseMedalStore(value.medals, plan.id),
    economy: parseEconomyStore(value.economy, plan.id),
  };
}

export function restoreTeacherSnapshot(
  snapshotValue: unknown,
  updatedAt: string,
): SavedPreparation[] {
  if (!Number.isFinite(Date.parse(updatedAt)))
    throw new Error('서버 저장 시간을 확인해 주세요.');
  const snapshot = parseTeacherSnapshot(snapshotValue);
  const saved: SavedPreparation = { ...snapshot.plan, savedAt: updatedAt };
  const current = readPreparations().find((plan) => plan.id === saved.id);
  if (current && Date.parse(current.savedAt) > Date.parse(updatedAt))
    return readPreparations();

  const merged = mergeServerPreparations([saved]);
  localStorage.setItem(practiceKey(saved.id), JSON.stringify(snapshot.practice));
  localStorage.setItem(medalKey(saved.id), JSON.stringify(snapshot.medals));
  localStorage.setItem(economyKey(saved.id), JSON.stringify(snapshot.economy));
  return merged;
}
