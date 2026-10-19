import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createBoardHandler } from './handler.ts';
import { createPreparation } from '../../../src/features/preparation/model.ts';
import { studentBoardData } from '../../../src/shared/domain/studentBoard.ts';
const key = 'test-only-owner-key-'.repeat(3);
const token = '12345678-1234-4234-8234-123456789abc';
const env = {
  SUPABASE_URL: 'https://database.test',
  SUPABASE_SERVICE_ROLE_KEY: 'test-server-secret',
  CLASSROOM_OWNER_KEY: key,
  ALLOWED_ORIGINS: 'https://classroom.test',
};
const json = (value: unknown) => Response.json(value);
const request = (data: unknown, ownerKey = key) =>
  new Request('https://edge.test/student-board', {
    method: 'POST',
    headers: {
      origin: 'https://classroom.test',
      'x-classroom-owner-key': ownerKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(data),
  });
function plan() {
  const value = createPreparation();
  value.className = '우리 반 원정';
  value.students = [{ id: 'a', name: '민준' }];
  value.teams[0].studentIds = ['a'];
  return value;
}
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());
describe('student sharing API boundary', () => {
  it('denies anonymous publishing before reaching the database', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const handler = createBoardHandler(env, fetcher);
    expect((await handler(request({ plan: plan() }, ''))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails closed when owner publishing is not configured', async () => {
    const handler = createBoardHandler({ ...env, CLASSROOM_OWNER_KEY: '' }, vi.fn());
    expect((await handler(request({ plan: plan() }))).status).toBe(503);
  });
  it('allows public GET only for the exact unpredictable team token and filters fields again', async () => {
    const board = studentBoardData(plan(), 0);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        json([{ payload: { ...board, privateBoss: 'BOSS_01', ownerKey: key } }]),
      );
    const response = await createBoardHandler(
      env,
      fetcher,
    )(new Request(`https://edge.test/student-board?token=${token}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(board);
    expect(String(fetcher.mock.calls[0][0])).toContain(`token=eq.${token}`);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('does not allow listing or reading teacher backups with a student token', async () => {
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
  it('publishes allowlisted snapshots and a private preparation in one RPC', async () => {
    const value = plan();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
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
    )(request({ plan: { ...value, ownerSecret: key }, rotate: true }));
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain(key);
    expect(String(fetcher.mock.calls[0][0])).toContain('rpc/publish_student_boards');
  });
  it('rejects forbidden origins, unsupported methods and malformed data', async () => {
    const fetcher = vi.fn<typeof fetch>();
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
    expect((await handler(request({ plan: {} }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
