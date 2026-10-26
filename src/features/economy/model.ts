import type { MedalStore } from '../medals/model';
import { medalPoints } from '../medals/model';
import type { PracticeStore } from '../matches/practiceModel';
import type { Preparation } from '../preparation/model';
import { readySeasonIndices } from '../preparation/model';
import { currentSeasonIndex, previewHistory } from '../expedition/operations';

export const UNIT_PRICE = 30 as const;
export const HINT_PRICE = 100 as const;
export const economyUnitIds = ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04'] as const;
export type EconomyUnitId = (typeof economyUnitIds)[number];
export type EconomyItemId = EconomyUnitId | 'BOSS_HINT';
export type TeamKey = `team-${0 | 1 | 2 | 3}`;

const itemNames: Record<EconomyItemId, string> = {
  UNIT_01: '도토리 탐험가',
  UNIT_02: '숲속 해머단',
  UNIT_03: '잎사귀 수호자',
  UNIT_04: '별빛 요정',
  BOSS_HINT: '비밀 보스 힌트',
};

export interface EconomyPurchase {
  id: string;
  teamKey: TeamKey;
  teamName: string;
  seasonIndex: number;
  itemId: EconomyItemId;
  itemName: string;
  price: 30 | 100;
  purchasedAt: string;
  actor: 'local-team' | 'student-board';
}

export interface EconomyReversal {
  id: string;
  purchaseId: string;
  reason: string;
  reversedAt: string;
  actor: 'local-teacher';
}

export interface EconomyStore {
  version: 1;
  expeditionId: string;
  purchases: EconomyPurchase[];
  reversals: EconomyReversal[];
}

export interface EconomySources {
  practice: PracticeStore | null;
  medals: MedalStore | null;
}

export interface TeamEconomySummary {
  matchEarned: number | null;
  medalEarned: number | null;
  spent: number;
  balance: number | null;
  inventory: Record<EconomyUnitId, number>;
  hintPurchased: boolean;
  activePurchases: EconomyPurchase[];
}

export const economyKey = (id: string) => `jre.practice-economy.v1.${id}`;

const emptyStore = (id: string): EconomyStore => ({
  version: 1,
  expeditionId: id,
  purchases: [],
  reversals: [],
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const isText = (value: unknown): value is string => typeof value === 'string';
const isSeason = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) < 5;
const isDate = (value: unknown): value is string =>
  isText(value) && Number.isFinite(Date.parse(value));
const isItemId = (value: unknown): value is EconomyItemId =>
  value === 'BOSS_HINT' || economyUnitIds.includes(value as EconomyUnitId);
const priceFor = (itemId: EconomyItemId): 30 | 100 =>
  itemId === 'BOSS_HINT' ? HINT_PRICE : UNIT_PRICE;

function isPurchase(value: unknown): value is EconomyPurchase {
  if (!isObject(value) || !isItemId(value.itemId)) return false;
  return (
    isText(value.id) &&
    value.id.length > 0 &&
    isText(value.teamKey) &&
    /^team-[0-3]$/.test(value.teamKey) &&
    isText(value.teamName) &&
    value.teamName.length > 0 &&
    isSeason(value.seasonIndex) &&
    value.itemName === itemNames[value.itemId] &&
    value.price === priceFor(value.itemId) &&
    isDate(value.purchasedAt) &&
    (value.actor === 'local-team' || value.actor === 'student-board')
  );
}

function isReversal(
  value: unknown,
  purchases: EconomyPurchase[],
): value is EconomyReversal {
  return (
    isObject(value) &&
    isText(value.id) &&
    value.id.length > 0 &&
    isText(value.purchaseId) &&
    purchases.some((purchase) => purchase.id === value.purchaseId) &&
    isText(value.reason) &&
    value.reason.trim().length >= 3 &&
    value.reason.length <= 200 &&
    isDate(value.reversedAt) &&
    value.actor === 'local-teacher'
  );
}

export function readEconomy(id: string): EconomyStore {
  const raw = localStorage.getItem(economyKey(id));
  if (raw === null) return emptyStore(id);
  try {
    return parseEconomyStore(JSON.parse(raw), id);
  } catch {
    throw new Error(
      '포인트·구매 기록을 읽을 수 없어요. 원본은 보존했으며 구매를 막았어요.',
    );
  }
}

export function parseEconomyStore(value: unknown, id: string): EconomyStore {
  try {
    if (
      !isObject(value) ||
      value.version !== 1 ||
      value.expeditionId !== id ||
      !Array.isArray(value.purchases) ||
      !value.purchases.every(isPurchase) ||
      new Set(value.purchases.map((purchase) => purchase.id)).size !==
        value.purchases.length ||
      !Array.isArray(value.reversals)
    )
      throw new Error();
    const purchases = value.purchases as EconomyPurchase[];
    if (
      !value.reversals.every((reversal) => isReversal(reversal, purchases)) ||
      new Set(value.reversals.map((reversal) => reversal.id)).size !==
        value.reversals.length ||
      new Set(value.reversals.map((reversal) => reversal.purchaseId)).size !==
        value.reversals.length
    )
      throw new Error();
    return value as unknown as EconomyStore;
  } catch {
    throw new Error(
      '포인트·구매 기록을 읽을 수 없어요. 원본은 보존했으며 구매를 막았어요.',
    );
  }
}

function commit(store: EconomyStore): EconomyStore {
  localStorage.setItem(economyKey(store.expeditionId), JSON.stringify(store));
  return store;
}

export function activePurchases(store: EconomyStore): EconomyPurchase[] {
  const reversed = new Set(store.reversals.map((entry) => entry.purchaseId));
  return store.purchases.filter((purchase) => !reversed.has(purchase.id));
}

export interface StudentBoardPurchase {
  requestId: string;
  teamIndex: number;
  seasonIndex: number;
  itemId: EconomyItemId;
  price: 30 | 100;
  purchasedAt: string;
}

export interface StudentBoardPurchaseReversal {
  reversalId: string;
  requestId: string;
  reason: string;
  reversedAt: string;
}

export function mergeStudentBoardPurchases(
  plan: Preparation,
  rows: StudentBoardPurchase[],
  reversalRows: StudentBoardPurchaseReversal[] = [],
): EconomyStore {
  const store = readEconomy(plan.id);
  const known = new Set(store.purchases.map((purchase) => purchase.id));
  const additions = rows.flatMap((row): EconomyPurchase[] => {
    if (
      known.has(row.requestId) ||
      !/^team-[0-3]$/.test(`team-${row.teamIndex}`) ||
      !isSeason(row.seasonIndex) ||
      !isItemId(row.itemId) ||
      row.price !== priceFor(row.itemId) ||
      !isDate(row.purchasedAt) ||
      !plan.teams[row.teamIndex]
    )
      return [];
    known.add(row.requestId);
    return [
      {
        id: row.requestId,
        teamKey: `team-${row.teamIndex}` as TeamKey,
        teamName: plan.teams[row.teamIndex].name,
        seasonIndex: row.seasonIndex,
        itemId: row.itemId,
        itemName: itemNames[row.itemId],
        price: row.price,
        purchasedAt: row.purchasedAt,
        actor: 'student-board',
      },
    ];
  });
  const purchases = [...store.purchases, ...additions];
  const knownReversals = new Set(store.reversals.map((entry) => entry.id));
  const reversedPurchases = new Set(store.reversals.map((entry) => entry.purchaseId));
  const reversalAdditions = reversalRows.flatMap((row): EconomyReversal[] => {
    if (
      knownReversals.has(row.reversalId) ||
      reversedPurchases.has(row.requestId) ||
      !purchases.some((purchase) => purchase.id === row.requestId) ||
      !row.reason ||
      row.reason.trim().length < 3 ||
      row.reason.length > 200 ||
      !isDate(row.reversedAt)
    )
      return [];
    knownReversals.add(row.reversalId);
    reversedPurchases.add(row.requestId);
    return [
      {
        id: row.reversalId,
        purchaseId: row.requestId,
        reason: row.reason.trim(),
        reversedAt: row.reversedAt,
        actor: 'local-teacher',
      },
    ];
  });
  return additions.length || reversalAdditions.length
    ? commit({
        ...store,
        purchases,
        reversals: [...store.reversals, ...reversalAdditions],
      })
    : store;
}

export function teamEconomySummary(
  plan: Preparation,
  sources: EconomySources,
  store: EconomyStore | null,
  teamIndex: number,
  seasonIndex: number,
): TeamEconomySummary {
  const teamKey = `team-${teamIndex}` as TeamKey;
  const matchPoints = sources.practice
    ? previewHistory(sources.practice.history, seasonIndex).points.get(teamKey)
    : null;
  const matchEarned = matchPoints === undefined ? 0 : matchPoints;
  const medalEarned = sources.medals
    ? medalPoints(sources.medals, teamIndex, seasonIndex)
    : null;
  const purchases = store
    ? activePurchases(store).filter(
        (purchase) =>
          purchase.teamKey === teamKey && purchase.seasonIndex === seasonIndex,
      )
    : [];
  const spent = purchases.reduce((sum, purchase) => sum + purchase.price, 0);
  const inventory = Object.fromEntries(
    economyUnitIds.map((id) => [
      id,
      purchases.filter((purchase) => purchase.itemId === id).length,
    ]),
  ) as Record<EconomyUnitId, number>;
  return {
    matchEarned,
    medalEarned,
    spent,
    balance:
      store && matchEarned !== null && medalEarned !== null
        ? matchEarned + medalEarned - spent
        : null,
    inventory,
    hintPurchased: purchases.some((purchase) => purchase.itemId === 'BOSS_HINT'),
    activePurchases: purchases,
  };
}

export function purchaseItem(
  plan: Preparation,
  sources: EconomySources,
  teamIndex: number,
  seasonIndex: number,
  itemId: EconomyItemId,
  requestId: string,
): EconomyStore {
  const store = readEconomy(plan.id);
  const existing = store.purchases.find((purchase) => purchase.id === requestId);
  const teamKey = `team-${teamIndex}` as TeamKey;
  if (existing) {
    if (
      existing.teamKey !== teamKey ||
      existing.seasonIndex !== seasonIndex ||
      existing.itemId !== itemId
    )
      throw new Error('이미 사용한 구매 요청이에요. 준비 화면을 다시 열어 주세요.');
    return store;
  }
  if (!requestId.trim()) throw new Error('구매 요청을 확인해 주세요.');
  const team = plan.teams[teamIndex];
  if (!team) throw new Error('원정대를 확인해 주세요.');
  if (
    seasonIndex !== currentSeasonIndex(plan) ||
    !readySeasonIndices(plan).includes(seasonIndex)
  )
    throw new Error('현재 기록할 시즌을 먼저 준비해 주세요.');
  const summary = teamEconomySummary(plan, sources, store, teamIndex, seasonIndex);
  if (itemId === 'BOSS_HINT' && summary.hintPurchased)
    throw new Error('이번 시즌에는 이미 비밀 보스 힌트를 구매했어요.');
  const price = priceFor(itemId);
  if (summary.balance === null)
    throw new Error('포인트 기록을 모두 확인한 뒤 구매할 수 있어요.');
  if (summary.balance < price)
    throw new Error(`포인트가 ${price - summary.balance}P 부족해요.`);
  return commit({
    ...store,
    purchases: [
      ...store.purchases,
      {
        id: requestId,
        teamKey,
        teamName: team.name,
        seasonIndex,
        itemId,
        itemName: itemNames[itemId],
        price,
        purchasedAt: new Date().toISOString(),
        actor: 'local-team',
      },
    ],
  });
}

export function reversePurchase(
  expeditionId: string,
  purchaseId: string,
  requestId: string,
  reason: string,
): EconomyStore {
  const store = readEconomy(expeditionId);
  const cleanReason = reason.trim();
  const existing = store.reversals.find((entry) => entry.id === requestId);
  if (existing) {
    if (existing.purchaseId !== purchaseId || existing.reason !== cleanReason)
      throw new Error('이미 사용한 구매 취소 요청이에요. 준비 화면을 다시 열어 주세요.');
    return store;
  }
  if (!store.purchases.some((purchase) => purchase.id === purchaseId))
    throw new Error('취소할 구매 기록을 찾지 못했어요.');
  if (store.reversals.some((entry) => entry.purchaseId === purchaseId))
    throw new Error('이미 취소한 구매예요.');
  if (!requestId.trim()) throw new Error('구매 취소 요청을 확인해 주세요.');
  if (cleanReason.length < 3 || cleanReason.length > 200)
    throw new Error('취소 사유를 3자 이상 200자 이내로 입력해 주세요.');
  return commit({
    ...store,
    reversals: [
      ...store.reversals,
      {
        id: requestId,
        purchaseId,
        reason: cleanReason,
        reversedAt: new Date().toISOString(),
        actor: 'local-teacher',
      },
    ],
  });
}

const bossHints: Record<string, string> = {
  BOSS_01: '상대는 물리 공격을 주로 사용해요. 잎사귀 수호자가 방어에 유리해요.',
  BOSS_02: '상대는 마법 공격을 주로 사용해요. 별빛 요정이 방어에 유리해요.',
  BOSS_03: '상대는 마법 공격을 주로 사용해요. 별빛 요정이 방어에 유리해요.',
  BOSS_04: '상대는 물리 공격을 주로 사용해요. 잎사귀 수호자가 방어에 유리해요.',
  BOSS_05:
    '상대는 물리와 마법 공격을 고르게 사용해요. 두 방어 병력을 균형 있게 준비해요.',
};

export function purchasedHint(plan: Preparation, seasonIndex: number): string {
  return bossHints[plan.seasons[seasonIndex]?.bossId] ?? '힌트 내용을 확인할 수 없어요.';
}
