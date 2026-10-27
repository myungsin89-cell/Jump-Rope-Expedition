import { describe, expect, it, vi } from 'vitest';
import { createBoardHandler } from './handler.ts';
import { createPreparation } from '../../../src/features/preparation/model.ts';
import { studentBoardData } from '../../../src/shared/domain/studentBoard.ts';

const token = '12345678-1234-4234-8234-123456789abc';
const userId = '87654321-4321-4321-8321-cba987654321';
const env = {
  SUPABASE_URL: 'https://database.test',
  SUPABASE_SERVICE_ROLE_KEY: 'test-server-secret',
  ALLOWED_ORIGINS: 'https://classroom.test',
};
const json = (value: unknown, init?: ResponseInit) => Response.json(value, init);
const request = (data: unknown, jwt = 'signed-teacher-jwt') =>
  new Request('https://edge.test/student-board', {
    method: 'POST',
    headers: {
      origin: 'https://classroom.test',
      authorization: jwt ? `Bearer ${jwt}` : '',
      'content-type': 'application/json',
    },
    body: JSON.stringify(data),
  });

function plan() {
  const value = createPreparation();
  value.className = '우리 반 원정';
  value.students = [{ id: 'a', name: '민준' }];
  value.roster = '민준';
  value.teams[0].studentIds = ['a'];
  value.currentSeasonIndex = 0;
  return value;
}

function authenticatedFetcher(
  database: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.endsWith('/auth/v1/user')) return json({ id: userId });
    return database(url, init);
  });
}

describe('student sharing API boundary', () => {
  it('denies anonymous publishing before reaching Supabase Auth or the database', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const handler = createBoardHandler(env, fetcher);
    expect((await handler(request({ action: 'publish', plan: plan() }, ''))).status).toBe(
      401,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('denies an invalid teacher JWT', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({}, { status: 401 }));
    const response = await createBoardHandler(
      env,
      fetcher,
    )(request({ action: 'publish', plan: plan() }));
    expect(response.status).toBe(401);
    expect(String(fetcher.mock.calls[0][0])).toContain('/auth/v1/user');
  });

  it('allows public GET only for the exact unpredictable team token and filters fields again', async () => {
    const board = studentBoardData(plan(), 0);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(json([{ payload: { ...board, privateBoss: 'BOSS_01' } }]));
    const response = await createBoardHandler(
      env,
      fetcher,
    )(new Request(`https://edge.test/student-board?token=${token}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(board);
    expect(String(fetcher.mock.calls[0][0])).toContain(`token=eq.${token}`);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('does not allow listing teacher data with a student token', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const handler = createBoardHandler(env, fetcher);
    expect((await handler(new Request('https://edge.test/student-board'))).status).toBe(
      401,
    );
    expect(
      (await handler(new Request('https://edge.test/student-board?token=team-1'))).status,
    ).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('lets an exact team token request one sealed hero reveal without teacher login', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toContain('rpc/reveal_student_hero_authority');
      expect(JSON.parse(String(init?.body))).toEqual({ p_token: token, p_slot: 2 });
      return json({
        eventId: 'reward-2',
        slot: 2,
        heroId: 'H09',
        startedAt: '2026-10-22T00:00:02.500Z',
      });
    });
    const response = await createBoardHandler(
      env,
      fetcher,
    )(request({ action: 'reveal-hero', token, slot: 2 }, ''));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('reveal.heroId', 'H09');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('lets a team token buy one allowlisted shop item without teacher login', async () => {
    const requestId = '22222222-2222-4222-8222-222222222222';
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      expect(String(input)).toContain('rpc/purchase_student_team_item');
      expect(JSON.parse(String(init?.body))).toEqual({
        p_token: token,
        p_request_id: requestId,
        p_item_id: 'UNIT_02',
      });
      return json({ requestId, itemId: 'UNIT_02', price: 30, balance: 70 });
    });
    const response = await createBoardHandler(
      env,
      fetcher,
    )(request({ action: 'purchase', token, requestId, itemId: 'UNIT_02' }, ''));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('purchase.balance', 70);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('overlays server purchases onto the public board balance and inventory', async () => {
    const value = plan();
    const board = studentBoardData(value, 0, undefined, {
      economy: { version: 1, expeditionId: value.id, purchases: [], reversals: [] },
    });
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes('student_boards?'))
        return json([
          {
            payload: board,
            owner_id: userId,
            publication_id: value.id,
            team_index: 0,
          },
        ]);
      if (url.includes('hero_reward_tokens?')) return json([]);
      if (url.includes('hero_correction_ledger?')) return json([]);
      if (url.includes('student_team_accounts?'))
        return json([
          {
            earned_points: 100,
            teacher_spent_points: 0,
            base_inventory: { UNIT_01: 0, UNIT_02: 0, UNIT_03: 0, UNIT_04: 0 },
            base_hint_purchased: false,
            hint_text: '비밀 힌트',
          },
        ]);
      if (url.includes('student_team_purchases?'))
        return json([
          {
            request_id: '22222222-2222-4222-8222-222222222222',
            item_id: 'UNIT_03',
            price: 30,
          },
        ]);
      if (url.includes('student_team_purchase_reversals?')) return json([]);
      return json({}, { status: 404 });
    });
    const response = await createBoardHandler(
      env,
      fetcher,
    )(new Request(`https://edge.test/student-board?token=${token}`));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.economy).toMatchObject({ balance: 70, teacherSpentPoints: 30 });
    expect(result.economy.inventory.UNIT_03).toBe(1);
  });

  it('publishes allowlisted snapshots under the authenticated teacher owner', async () => {
    const value = plan();
    const fetcher = authenticatedFetcher(async (url, init) => {
      expect(url).toContain('rpc/publish_student_boards_v2');
      const body = JSON.parse(String(init?.body));
      expect(body.p_owner_id).toBe(userId);
      expect(body.p_boards).toHaveLength(3);
      expect(JSON.stringify(body.p_boards)).not.toContain('bossId');
      expect(body.p_preparation.id).toBe(value.id);
      return json(
        body.p_boards.map((payload: unknown, team_index: number) => ({
          payload,
          team_index,
          token,
        })),
      );
    });
    const response = await createBoardHandler(
      env,
      fetcher,
    )(request({ action: 'publish', plan: value, rotate: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty('links');
  });

  it('publishes only same-team revealed hero identities and keeps sealed cards private', async () => {
    const value = plan();
    const fetcher = authenticatedFetcher(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.p_boards[0].heroes).toEqual([
        { slot: 1, revealed: false },
        { slot: 2, revealed: true, heroId: 'H02', missionName: '네 가지 힘' },
      ]);
      expect(JSON.stringify(body.p_boards[0])).not.toContain('H01');
      expect(body.p_boards[0].heroReveal).toEqual({
        eventId: 'reward-visible',
        slot: 2,
        heroId: 'H02',
        startedAt: '2026-10-22T00:00:00.000Z',
        missionName: '네 가지 힘',
      });
      expect(body.p_boards[0].events).toEqual([
        {
          id: 'reward-visible',
          type: 'hero',
          missionName: '네 가지 힘',
          occurredAt: '2026-10-22T00:00:00.000Z',
        },
      ]);
      expect(body.p_boards[1].heroes).toEqual([]);
      return json(
        body.p_boards.map((payload: unknown, team_index: number) => ({
          payload,
          team_index,
          token,
        })),
      );
    });
    const response = await createBoardHandler(
      env,
      fetcher,
    )(
      request({
        action: 'publish',
        plan: value,
        heroes: {
          expeditionId: value.id,
          rewards: [
            { id: 'reward-sealed', teamIndex: 0, seasonIndex: 0, heroId: 'H01' },
            {
              id: 'reward-visible',
              teamIndex: 0,
              seasonIndex: 0,
              heroId: 'H02',
              missionId: 'FOUR_FORCES',
              revealedAt: '2026-10-22T00:00:00.000Z',
            },
          ],
        },
      }),
    );
    expect(response.status).toBe(200);
  });

  it('allows teacher to reverse a student purchase with a valid reason', async () => {
    const expeditionId = '11111111-2222-4333-8444-555555555555';
    const requestId = '66666666-7777-4888-8999-000000000000';
    const reversalId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    let recorded = false;
    const fetcher = authenticatedFetcher(async (url, init) => {
      if (url.includes('rpc/reverse_student_team_purchase')) {
        recorded = true;
        expect(JSON.parse(String(init?.body))).toEqual({
          p_owner_id: userId,
          p_expedition_id: expeditionId,
          p_request_id: requestId,
          p_reversal_id: reversalId,
          p_reason: '학생 오구매 취소',
        });
        return json({ reversalId, requestId, refundedPoints: 30 });
      }
      return json([]);
    });
    const handler = createBoardHandler(env, fetcher);
    const response = await handler(
      request({
        action: 'reverse-purchase',
        expeditionId,
        requestId,
        reversalId,
        reason: '학생 오구매 취소',
      }),
    );
    expect(response.status).toBe(200);
    expect(recorded).toBe(true);
    expect(await response.json()).toEqual({
      reversal: { reversalId, requestId, refundedPoints: 30 },
    });
  });

  it('rejects reversal with invalid reason', async () => {
    const fetcher = authenticatedFetcher(() => json({}));
    const handler = createBoardHandler(env, fetcher);
    const responseShort = await handler(
      request({
        action: 'reverse-purchase',
        expeditionId: '11111111-2222-4333-8444-555555555555',
        requestId: '66666666-7777-4888-8999-000000000000',
        reversalId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        reason: '취',
      }),
    );
    expect(responseShort.status).toBe(400);
  });

  it('rejects forbidden origins, unsupported methods and malformed data', async () => {
    const fetcher = authenticatedFetcher(() => json([]));
    const handler = createBoardHandler(env, fetcher);
    expect(
      (
        await handler(
          new Request('https://edge.test', {
            method: 'OPTIONS',
            headers: { origin: 'https://evil.test' },
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await handler(new Request('https://edge.test', { method: 'DELETE' }))).status,
    ).toBe(405);
    expect((await handler(request({ action: 'publish', plan: {} }))).status).toBe(400);
  });
});
