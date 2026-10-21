import type {
  BattleAuthorityInput,
  BattleAuthorityResult,
} from '../domain/battleAuthority';
import { parseBattleAuthorityResult } from '../domain/battleAuthority';
import { appEnv } from '../config/env';
import { supabase } from './supabase';
import type { HeroReward, HeroStore } from '../../features/heroes/model';
import {
  revealHero,
  revealSeasonHeroes,
  saveHeroStore,
} from '../../features/heroes/model';

const testBypass =
  import.meta.env.DEV && import.meta.env.VITE_AUTH_TEST_BYPASS === 'true';

export const usesGameAuthority = () => appEnv.isGameAuthorityConfigured && !testBypass;

async function postAuthority(body: Record<string, unknown>): Promise<unknown> {
  if (!supabase || !appEnv.gameAuthorityUrl)
    throw new Error('게임 권한 서버가 아직 연결되지 않았어요.');
  const endpoint = new URL(appEnv.gameAuthorityUrl);
  if (
    endpoint.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(endpoint.hostname)
  )
    throw new Error('로그인 보호를 위해 HTTPS 게임 서버를 사용해 주세요.');
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new Error('교사 로그인이 만료됐어요. 다시 로그인해 주세요.');
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error('교사 로그인이 만료됐어요. 다시 로그인해 주세요.');
    if (response.status === 400)
      throw new Error('게임 서버가 입력 자료를 확인하지 못했어요.');
    throw new Error('게임 권한 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  return response.json();
}

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function parseClaim(value: unknown) {
  if (
    !object(value) ||
    typeof value.rewardId !== 'string' ||
    typeof value.achievementId !== 'string' ||
    !(
      value.heroId === null ||
      (typeof value.heroId === 'string' && /^H(0[1-9]|1[0-5])$/.test(value.heroId))
    ) ||
    typeof value.awardedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.awardedAt)) ||
    !(
      value.revealedAt === null ||
      value.revealedAt === undefined ||
      (typeof value.revealedAt === 'string' &&
        Number.isFinite(Date.parse(value.revealedAt)))
    )
  )
    throw new Error('영웅 서버 결과를 확인해 주세요.');
  return value;
}

export async function syncHeroRewardsWithAuthority(
  expeditionId: string,
  store: HeroStore,
): Promise<HeroStore> {
  if (!usesGameAuthority() || !store.rewards.length) return store;
  const value = await postAuthority({
    action: 'claim-heroes',
    expeditionId,
    rewards: store.rewards,
  });
  if (!object(value) || !Array.isArray(value.rewards))
    throw new Error('영웅 서버 결과를 확인해 주세요.');
  const claims = new Map(
    value.rewards.map((item) => {
      const claim = parseClaim(item);
      return [claim.achievementId as string, claim] as const;
    }),
  );
  if (claims.size !== store.rewards.length)
    throw new Error('일부 영웅 결과를 서버에서 받지 못했어요.');
  const next: HeroStore = {
    ...store,
    rewards: store.rewards.map((reward) => {
      const claim = claims.get(reward.achievementId)!;
      return {
        ...reward,
        heroId: claim.heroId as string | null,
        awardedAt: claim.awardedAt as string,
        ...(typeof claim.revealedAt === 'string' ? { revealedAt: claim.revealedAt } : {}),
      };
    }),
  };
  return saveHeroStore(next);
}

function parseReveal(value: unknown) {
  if (
    !object(value) ||
    typeof value.rewardId !== 'string' ||
    typeof value.heroId !== 'string' ||
    !/^H(0[1-9]|1[0-5])$/.test(value.heroId) ||
    !Number.isInteger(value.teamIndex) ||
    !Number.isInteger(value.seasonIndex) ||
    typeof value.revealedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.revealedAt))
  )
    throw new Error('영웅 공개 서버 결과를 확인해 주세요.');
  return value;
}

export async function revealHeroWithAuthority(
  expeditionId: string,
  store: HeroStore,
  rewardId: string,
): Promise<HeroStore> {
  if (!usesGameAuthority()) return revealHero(expeditionId, rewardId);
  const synced = await syncHeroRewardsWithAuthority(expeditionId, store);
  const value = await postAuthority({ action: 'reveal-hero', expeditionId, rewardId });
  if (!object(value) || !('reveal' in value))
    throw new Error('영웅 공개 서버 결과를 확인해 주세요.');
  const reveal = parseReveal(value.reveal);
  return saveHeroStore({
    ...synced,
    rewards: synced.rewards.map((reward) =>
      reward.id === rewardId
        ? {
            ...reward,
            heroId: reveal.heroId as string,
            revealedAt: reveal.revealedAt as string,
          }
        : reward,
    ),
  });
}

export async function revealSeasonHeroesWithAuthority(
  expeditionId: string,
  store: HeroStore,
  seasonIndex: number,
): Promise<HeroStore> {
  if (!usesGameAuthority()) return revealSeasonHeroes(expeditionId, seasonIndex);
  const synced = await syncHeroRewardsWithAuthority(expeditionId, store);
  const value = await postAuthority({
    action: 'reveal-season',
    expeditionId,
    seasonIndex,
  });
  if (
    !object(value) ||
    !object(value.reveal) ||
    typeof value.reveal.revealedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.reveal.revealedAt))
  )
    throw new Error('시즌 영웅 공개 서버 결과를 확인해 주세요.');
  const revealedAt = value.reveal.revealedAt;
  return saveHeroStore({
    ...synced,
    rewards: synced.rewards.map((reward) =>
      reward.seasonIndex === seasonIndex && reward.heroId && !reward.revealedAt
        ? { ...reward, revealedAt }
        : reward,
    ),
  });
}

export async function calculateBattleWithAuthority(
  expeditionId: string,
  requestKey: string,
  input: BattleAuthorityInput,
): Promise<BattleAuthorityResult | null> {
  if (!usesGameAuthority()) return null;
  const value = await postAuthority({
    action: 'calculate-battle',
    expeditionId,
    requestKey,
    input,
  });
  if (!object(value) || !('result' in value))
    throw new Error('최종 대전 서버 결과를 확인해 주세요.');
  return parseBattleAuthorityResult(value.result);
}

export async function finishBattleWithAuthority(
  expeditionId: string,
  seasonIndex: number,
): Promise<string | null> {
  if (!usesGameAuthority()) return null;
  const value = await postAuthority({
    action: 'finish-battle',
    expeditionId,
    seasonIndex,
  });
  if (
    !object(value) ||
    typeof value.finishedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.finishedAt))
  )
    throw new Error('최종 대전 완료 서버 결과를 확인해 주세요.');
  return value.finishedAt;
}

export function rewardById(store: HeroStore, rewardId: string): HeroReward | null {
  return store.rewards.find((reward) => reward.id === rewardId) ?? null;
}
