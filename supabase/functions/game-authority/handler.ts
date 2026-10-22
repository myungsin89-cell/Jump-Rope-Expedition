import {
  BATTLE_RULE_VERSION,
  calculateBattleAuthority,
  parseBattleAuthorityInput,
  parseBattleAuthorityResult,
} from '../../../src/shared/domain/battleAuthority.ts';
import { isUuid } from '../../../src/shared/domain/studentBoard.ts';

type Environment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGINS?: string;
};

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const date = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

function parseReward(value: unknown) {
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    !value.id.length ||
    value.id.length > 320 ||
    typeof value.achievementId !== 'string' ||
    !value.achievementId.length ||
    value.achievementId.length > 300 ||
    ![
      'FIVE_STEPS',
      'SHINING_CHALLENGE',
      'SHINING_COMPANIONS',
      'STEADY_STEPS',
      'COMEBACK',
      'FOUR_FORCES',
    ].includes(String(value.missionId)) ||
    !Number.isInteger(value.teamIndex) ||
    Number(value.teamIndex) < 0 ||
    Number(value.teamIndex) > 3 ||
    !Number.isInteger(value.seasonIndex) ||
    Number(value.seasonIndex) < 0 ||
    Number(value.seasonIndex) > 4 ||
    !date(value.awardedAt) ||
    !(
      value.heroId === null ||
      (typeof value.heroId === 'string' && /^H(0[1-9]|1[0-5])$/.test(value.heroId))
    ) ||
    !(
      value.revealedAt === undefined ||
      (typeof value.revealedAt === 'string' && date(value.revealedAt))
    ) ||
    !Array.isArray(value.contributorIds) ||
    !Array.isArray(value.contributorNames) ||
    value.contributorIds.length !== value.contributorNames.length ||
    value.contributorIds.length > 30 ||
    !value.contributorIds.every((item) => typeof item === 'string') ||
    !value.contributorNames.every((item) => typeof item === 'string')
  )
    throw new Error('Invalid hero reward');
  return {
    id: value.id,
    achievementId: value.achievementId,
    missionId: value.missionId,
    teamIndex: Number(value.teamIndex),
    seasonIndex: Number(value.seasonIndex),
    awardedAt: value.awardedAt,
    heroId: value.heroId,
    ...(typeof value.revealedAt === 'string' ? { revealedAt: value.revealedAt } : {}),
    contributorIds: value.contributorIds,
    contributorNames: value.contributorNames,
  };
}

export function createGameAuthorityHandler(
  env: Environment,
  fetcher: typeof fetch = fetch,
) {
  const allowed = new Set(
    (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const cors =
      origin && allowed.has(origin)
        ? {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'authorization,content-type',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            Vary: 'Origin',
          }
        : {};
    const headers = {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      ...cors,
    };
    const respond = (data: unknown, status = 200) =>
      Response.json(data, { status, headers });
    if (request.method === 'OPTIONS')
      return origin && allowed.has(origin)
        ? new Response(null, { status: 204, headers })
        : respond({ error: 'Forbidden origin' }, 403);
    if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
    if (origin && !allowed.has(origin))
      return respond({ error: 'Forbidden origin' }, 403);
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
      return respond({ error: 'Server not configured' }, 503);
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 4096)
      return respond({ error: 'Unauthorized' }, 401);
    const authResponse = await fetcher(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: authorization,
      },
    });
    if (!authResponse.ok) return respond({ error: 'Unauthorized' }, 401);
    const authUser = await authResponse.json();
    if (!object(authUser) || !isUuid(authUser.id))
      return respond({ error: 'Unauthorized' }, 401);
    if (Number(request.headers.get('content-length') ?? 0) > 300_000)
      return respond({ error: 'Payload too large' }, 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 300_000)
      return respond({ error: 'Payload too large' }, 413);
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return respond({ error: 'Invalid JSON' }, 400);
    }
    if (!object(value) || typeof value.action !== 'string')
      return respond({ error: 'Invalid request' }, 400);
    const serviceHeaders = {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    };
    const rest = async (rpc: string, body: Record<string, unknown>) =>
      fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${rpc}`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify(body),
      });
    try {
      if (!isUuid(value.expeditionId)) throw new Error('Invalid expedition');
      if (value.action === 'claim-heroes') {
        if (!Array.isArray(value.rewards) || value.rewards.length > 300)
          throw new Error('Invalid hero rewards');
        const rewards = [];
        for (const rawReward of value.rewards) {
          const reward = parseReward(rawReward);
          const response = await rest('claim_hero_reward_authority', {
            p_owner_id: authUser.id,
            p_expedition_id: value.expeditionId,
            p_achievement_id: reward.achievementId,
            p_reward_id: reward.id,
            p_mission_id: reward.missionId,
            p_team_index: reward.teamIndex,
            p_season_index: reward.seasonIndex,
            p_achieved_at: reward.awardedAt,
            p_revealed_at: reward.revealedAt ?? null,
            p_legacy_hero_id: reward.revealedAt ? reward.heroId : null,
            p_contributor_ids: reward.contributorIds,
            p_contributor_names: reward.contributorNames,
          });
          if (!response.ok) return respond({ error: 'Hero authority unavailable' }, 503);
          rewards.push(await response.json());
        }
        return respond({ rewards });
      }
      if (value.action === 'reveal-hero') {
        if (typeof value.rewardId !== 'string' || !value.rewardId.length)
          throw new Error('Invalid reward');
        const response = await rest('reveal_hero_reward_authority', {
          p_owner_id: authUser.id,
          p_expedition_id: value.expeditionId,
          p_reward_id: value.rewardId,
        });
        if (!response.ok) return respond({ error: 'Hero reveal unavailable' }, 503);
        return respond({ reveal: await response.json() });
      }
      if (value.action === 'reveal-season') {
        if (!Number.isInteger(value.seasonIndex)) throw new Error('Invalid season');
        const response = await rest('reveal_season_heroes_authority', {
          p_owner_id: authUser.id,
          p_expedition_id: value.expeditionId,
          p_season_index: value.seasonIndex,
        });
        if (!response.ok) return respond({ error: 'Hero reveal unavailable' }, 503);
        return respond({ reveal: await response.json() });
      }
      if (value.action === 'calculate-battle') {
        if (typeof value.requestKey !== 'string' || !value.requestKey.length)
          throw new Error('Invalid request key');
        const input = parseBattleAuthorityInput(value.input);
        const rewardsUrl = new URL('/rest/v1/hero_reward_tokens', env.SUPABASE_URL);
        rewardsUrl.searchParams.set('owner_id', `eq.${authUser.id}`);
        rewardsUrl.searchParams.set('expedition_id', `eq.${value.expeditionId}`);
        rewardsUrl.searchParams.set('season_index', `eq.${input.seasonIndex}`);
        rewardsUrl.searchParams.set('select', 'reward_id,team_index,hero_id');
        const rewardsResponse = await fetcher(rewardsUrl, { headers: serviceHeaders });
        if (!rewardsResponse.ok)
          return respond({ error: 'Hero authority unavailable' }, 503);
        const rewardRows: unknown = await rewardsResponse.json();
        if (!Array.isArray(rewardRows))
          return respond({ error: 'Hero authority unavailable' }, 503);
        const correctionsUrl = new URL(
          '/rest/v1/hero_correction_ledger',
          env.SUPABASE_URL,
        );
        correctionsUrl.searchParams.set('owner_id', `eq.${authUser.id}`);
        correctionsUrl.searchParams.set('expedition_id', `eq.${value.expeditionId}`);
        correctionsUrl.searchParams.set('select', 'reward_id');
        const correctionsResponse = await fetcher(correctionsUrl, {
          headers: serviceHeaders,
        });
        if (!correctionsResponse.ok)
          return respond({ error: 'Hero authority unavailable' }, 503);
        const correctionRows: unknown = await correctionsResponse.json();
        if (!Array.isArray(correctionRows))
          return respond({ error: 'Hero authority unavailable' }, 503);
        const correctedRewardIds = new Set(
          correctionRows.flatMap((row) =>
            object(row) && typeof row.reward_id === 'string' ? [row.reward_id] : [],
          ),
        );
        for (const team of input.teams) {
          const authoritative = rewardRows
            .flatMap((row) =>
              object(row) &&
              typeof row.reward_id === 'string' &&
              !correctedRewardIds.has(row.reward_id) &&
              row.team_index === team.teamIndex &&
              typeof row.hero_id === 'string' &&
              /^H(0[1-9]|1[0-5])$/.test(row.hero_id)
                ? [row.hero_id]
                : [],
            )
            .sort();
          if (JSON.stringify([...team.heroIds].sort()) !== JSON.stringify(authoritative))
            return respond({ error: 'Hero snapshot does not match' }, 409);
        }
        const calculated = calculateBattleAuthority(input, new Date().toISOString());
        const response = await rest('store_final_battle_authority', {
          p_owner_id: authUser.id,
          p_expedition_id: value.expeditionId,
          p_season_index: input.seasonIndex,
          p_request_key: value.requestKey,
          p_rule_version: BATTLE_RULE_VERSION,
          p_input: input,
          p_result: calculated,
        });
        if (!response.ok) return respond({ error: 'Battle authority unavailable' }, 503);
        return respond({ result: parseBattleAuthorityResult(await response.json()) });
      }
      if (value.action === 'finish-battle') {
        if (!Number.isInteger(value.seasonIndex)) throw new Error('Invalid season');
        const response = await rest('finish_final_battle_authority', {
          p_owner_id: authUser.id,
          p_expedition_id: value.expeditionId,
          p_season_index: value.seasonIndex,
        });
        if (!response.ok) return respond({ error: 'Battle finish unavailable' }, 503);
        return respond(await response.json());
      }
      return respond({ error: 'Invalid action' }, 400);
    } catch {
      return respond({ error: 'Invalid authority request' }, 400);
    }
  };
}
