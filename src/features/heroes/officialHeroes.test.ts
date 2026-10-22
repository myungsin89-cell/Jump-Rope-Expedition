import { describe, expect, it } from 'vitest';
import {
  recordOfficialHeroCorrection,
  setHeroTestBypass,
} from './officialHeroes';
import { createPreparation } from '../preparation/model';

function testPlan() {
  const plan = createPreparation();
  plan.id = '11111111-1111-4111-8111-111111111111';
  return plan;
}

describe('official heroes correction client', () => {
  it('bypasses server RPC when hero test bypass is enabled', async () => {
    setHeroTestBypass(true);
    const result = await recordOfficialHeroCorrection(
      testPlan(),
      'reward:FIVE_STEPS:1',
      'corr-1',
      '오지급 취소 및 회수',
    );
    expect(result).toMatchObject({
      correctionId: 'corr-1',
      rewardId: 'reward:FIVE_STEPS:1',
    });
    setHeroTestBypass(false);
  });

  it('rejects invalid reason before network call', async () => {
    await expect(
      recordOfficialHeroCorrection(testPlan(), 'reward:1', 'corr-1', '취'),
    ).rejects.toThrow('3자 이상');
  });

  it('gracefully returns null when Supabase session is not active', async () => {
    setHeroTestBypass(false);
    const result = await recordOfficialHeroCorrection(
      testPlan(),
      'reward:1',
      'corr-1',
      '정상 회수 사유 입력',
    );
    expect(result).toBeNull();
  });
});
