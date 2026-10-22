import { describe, expect, it } from 'vitest';
import { recordOfficialMedalAward, setMedalTestBypass } from './officialMedals';
import { createPreparation } from '../preparation/model';
import type { MedalAward } from './model';

function testPlan() {
  const plan = createPreparation();
  plan.id = '11111111-1111-4111-8111-111111111111';
  plan.students = [{ id: 's-1', name: '가람' }];
  plan.teams[0].studentIds = ['s-1'];
  plan.currentSeasonIndex = 0;
  return plan;
}

function testAward(): MedalAward {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    medalId: 'medal-courage',
    medal: {
      id: 'medal-courage',
      name: '용기 훈장',
      description: '용기 있게 도전했어요.',
      symbol: 'star',
      image: '',
      active: true,
    },
    studentId: 's-1',
    studentName: '가람',
    teamKey: 'team-0',
    teamName: '초록 원정대',
    seasonIndex: 0,
    awardedAt: '2026-10-22T00:00:00.000Z',
    actor: 'local-teacher',
  };
}

describe('official medals server ledger client', () => {
  it('bypasses server RPC when medal test bypass is enabled', async () => {
    setMedalTestBypass(true);
    const result = await recordOfficialMedalAward(testPlan(), testAward());
    expect(result).toEqual({
      awardId: '22222222-2222-4222-8222-222222222222',
      awardedAt: '2026-10-22T00:00:00.000Z',
    });
    setMedalTestBypass(false);
  });

  it('gracefully returns null when Supabase session is not active', async () => {
    setMedalTestBypass(false);
    const result = await recordOfficialMedalAward(testPlan(), testAward());
    expect(result).toBeNull();
  });
});
