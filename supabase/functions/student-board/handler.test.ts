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
        { slot: 2, revealed: true, heroId: 'H02' },
      ]);
      expect(JSON.stringify(body.p_boards[0])).not.toContain('H01');
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
            { teamIndex: 0, seasonIndex: 0, heroId: 'H01' },
            {
              teamIndex: 0,
              seasonIndex: 0,
              heroId: 'H02',
              revealedAt: '2026-10-22T00:00:00.000Z',
            },
          ],
        },
      }),
    );
    expect(response.status).toBe(200);
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
