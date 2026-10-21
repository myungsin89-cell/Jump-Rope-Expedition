import { describe, expect, it, vi } from 'vitest';
import { createPreparation } from '../preparation/model';
import { listTeacherBackups, saveTeacherBackup } from './teacherBackup';

const apiUrl = 'https://database.test';
const auth = {
  accessToken: 'signed-teacher-jwt',
  userId: '12345678-1234-4234-8234-123456789abc',
};
const options = { apiUrl, anonKey: 'public-anon-key', auth };

function plan() {
  const value = createPreparation();
  value.className = '우리 반 원정';
  value.students = [{ id: 'student-1', name: '민준' }];
  value.roster = '민준';
  value.teams[0].studentIds = ['student-1'];
  value.currentSeasonIndex = 0;
  return value;
}

function row(value = plan()) {
  return {
    snapshot: {
      version: 1,
      plan: value,
      practice: { version: 1, classId: value.id, draft: null, history: [] },
      medals: {
        version: 1,
        expeditionId: value.id,
        definitions: [],
        awards: [],
        entries: [],
      },
      economy: {
        version: 1,
        expeditionId: value.id,
        purchases: [],
        reversals: [],
      },
    },
    updated_at: '2026-10-21T00:00:00.000Z',
  };
}

describe('teacher backup client', () => {
  it('saves the complete expedition with the signed-in teacher identity', async () => {
    const value = plan();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
      expect(String(url)).toContain('/rest/v1/teacher_expeditions');
      expect(String(url)).toContain('on_conflict=owner_id%2Cexpedition_id');
      expect(init?.headers).toMatchObject({
        Authorization: `Bearer ${auth.accessToken}`,
        apikey: 'public-anon-key',
      });
      const body = JSON.parse(String(init?.body));
      expect(body.owner_id).toBe(auth.userId);
      expect(body.expedition_id).toBe(value.id);
      expect(body.snapshot).toMatchObject({ version: 1, plan: value });
      expect(body.snapshot.battles).toEqual({
        version: 1,
        expeditionId: value.id,
        battles: [],
      });
      return Response.json([row(value)]);
    });
    await expect(
      saveTeacherBackup(value, { ...options, fetcher }),
    ).resolves.toMatchObject({
      plan: value,
      updatedAt: '2026-10-21T00:00:00.000Z',
    });
  });

  it('lists and validates only rows returned by the teacher RLS query', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([row()]));
    await expect(listTeacherBackups({ ...options, fetcher })).resolves.toHaveLength(1);
    expect(String(fetcher.mock.calls[0][0])).toContain('order=updated_at.desc');
  });

  it('rejects insecure endpoints, unauthorized access and malformed data', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      saveTeacherBackup(plan(), {
        ...options,
        apiUrl: 'http://database.test',
        fetcher,
      }),
    ).rejects.toThrow('HTTPS');
    fetcher.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(listTeacherBackups({ ...options, fetcher })).rejects.toThrow('만료');
    fetcher.mockResolvedValueOnce(Response.json([{ snapshot: {} }]));
    await expect(listTeacherBackups({ ...options, fetcher })).rejects.toThrow('백업');
  });
});
