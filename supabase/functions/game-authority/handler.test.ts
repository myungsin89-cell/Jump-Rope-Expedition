import { describe, expect, it, vi } from 'vitest';
import { calculateBattleAuthority } from '../../../src/shared/domain/battleAuthority';
import { createGameAuthorityHandler } from './handler';

const userId = '11111111-1111-4111-8111-111111111111';
const expeditionId = '22222222-2222-4222-8222-222222222222';
const env = {
  SUPABASE_URL: 'https://database.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
  ALLOWED_ORIGINS: 'https://app.test',
};
const json = (value: unknown, init?: ResponseInit) => Response.json(value, init);
const request = (body: unknown, token = 'teacher-jwt') =>
  new Request('https://edge.test/game-authority', {
    method: 'POST',
    headers: {
      origin: 'https://app.test',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

function authenticatedFetcher(
  rpc: (url: string, init?: RequestInit) => Promise<Response> | Response,
) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return json({ id: userId });
    return rpc(url, init);
  });
}

function battleInput() {
  return {
    ruleVersion: 'battle-v1' as const,
    seasonIndex: 0,
    bossId: 'BOSS_01',
    matchCount: 2,
    eventPrefix: `battle:${expeditionId}:0`,
    teams: [
      {
        teamIndex: 0,
        teamName: '초록 원정대',
        inventory: { UNIT_01: 1, UNIT_02: 1, UNIT_03: 1, UNIT_04: 1 },
        heroIds: ['H12'],
        bestJumperExtra: 10,
      },
      {
        teamIndex: 1,
        teamName: '노랑 원정대',
        inventory: { UNIT_01: 1, UNIT_02: 0, UNIT_03: 0, UNIT_04: 0 },
        heroIds: [],
        bestJumperExtra: 0,
      },
    ],
  };
}

describe('game authority edge boundary', () => {
  it('calculates a deterministic battle on the server and stores only that result', async () => {
    const input = battleInput();
    const fetcher = authenticatedFetcher(async (url, init) => {
      if (url.includes('/hero_reward_tokens?'))
        return json([{ team_index: 0, hero_id: 'H12' }]);
      expect(url).toContain('/rpc/store_final_battle_authority');
      const body = JSON.parse(String(init?.body));
      expect(body.p_owner_id).toBe(userId);
      expect(body.p_input).toEqual(input);
      expect(body.p_rule_version).toBe('battle-v1');
      expect(body.p_result).toEqual(
        calculateBattleAuthority(input, body.p_result.calculatedAt),
      );
      return json(body.p_result);
    });
    const response = await createGameAuthorityHandler(
      env,
      fetcher,
    )(
      request({
        action: 'calculate-battle',
        expeditionId,
        requestKey: `battle:${expeditionId}:0`,
        input,
      }),
    );
    expect(response.status).toBe(200);
    const value = await response.json();
    expect(value.result.teams[0].actualDamage).toBeGreaterThan(
      value.result.teams[1].actualDamage,
    );
    expect(value.result.events.at(-1).type).toBe('result');
  });

  it('rejects a browser battle input that changes authoritative hero ownership', async () => {
    const fetcher = authenticatedFetcher(async (url) => {
      expect(url).toContain('/hero_reward_tokens?');
      return json([{ team_index: 0, hero_id: 'H14' }]);
    });
    const response = await createGameAuthorityHandler(
      env,
      fetcher,
    )(
      request({
        action: 'calculate-battle',
        expeditionId,
        requestKey: `battle:${expeditionId}:0`,
        input: battleInput(),
      }),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Hero snapshot does not match',
    });
  });

  it('claims hidden hero identities idempotently through the database function', async () => {
    const fetcher = authenticatedFetcher(async (url, init) => {
      expect(url).toContain('/rpc/claim_hero_reward_authority');
      const body = JSON.parse(String(init?.body));
      expect(body.p_owner_id).toBe(userId);
      expect(body.p_achievement_id).toBe('achievement-1');
      return json({
        rewardId: 'reward-1',
        achievementId: 'achievement-1',
        heroId: 'H09',
        awardedAt: '2026-10-22T00:00:00.000Z',
        revealedAt: null,
      });
    });
    const response = await createGameAuthorityHandler(
      env,
      fetcher,
    )(
      request({
        action: 'claim-heroes',
        expeditionId,
        rewards: [
          {
            id: 'reward-1',
            achievementId: 'achievement-1',
            missionId: 'FIVE_STEPS',
            teamIndex: 0,
            seasonIndex: 0,
            heroId: 'H01',
            awardedAt: '2026-10-22T00:00:00.000Z',
            contributorIds: [],
            contributorNames: [],
          },
        ],
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      rewards: [
        {
          rewardId: 'reward-1',
          achievementId: 'achievement-1',
          heroId: 'H09',
          awardedAt: '2026-10-22T00:00:00.000Z',
          revealedAt: null,
        },
      ],
    });
  });

  it('schedules one server reveal and records battle completion', async () => {
    const fetcher = authenticatedFetcher(async (url) => {
      if (url.includes('/rpc/reveal_hero_reward_authority'))
        return json({
          rewardId: 'reward-1',
          heroId: 'H09',
          teamIndex: 0,
          seasonIndex: 0,
          revealedAt: '2026-10-22T00:00:02.500Z',
        });
      expect(url).toContain('/rpc/finish_final_battle_authority');
      return json({ finishedAt: '2026-10-22T01:00:00.000Z' });
    });
    const handler = createGameAuthorityHandler(env, fetcher);
    const reveal = await handler(
      request({ action: 'reveal-hero', expeditionId, rewardId: 'reward-1' }),
    );
    expect(await reveal.json()).toMatchObject({
      reveal: { rewardId: 'reward-1', heroId: 'H09' },
    });
    const finish = await handler(
      request({ action: 'finish-battle', expeditionId, seasonIndex: 0 }),
    );
    expect(await finish.json()).toEqual({ finishedAt: '2026-10-22T01:00:00.000Z' });
  });

  it('rejects missing authentication, forbidden origins and malformed authority input', async () => {
    const handler = createGameAuthorityHandler(env, vi.fn<typeof fetch>());
    expect(
      (
        await handler(
          new Request('https://edge.test/game-authority', {
            method: 'POST',
            body: '{}',
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handler(
          new Request('https://edge.test/game-authority', {
            method: 'OPTIONS',
            headers: { origin: 'https://evil.test' },
          }),
        )
      ).status,
    ).toBe(403);
    const fetcher = authenticatedFetcher(() => json({}));
    expect(
      (
        await createGameAuthorityHandler(
          env,
          fetcher,
        )(request({ action: 'calculate-battle', expeditionId, input: {} }))
      ).status,
    ).toBe(400);
  });
});
