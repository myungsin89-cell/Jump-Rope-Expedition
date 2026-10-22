import {
  isUuid,
  parseStudentBoard,
  parseStudentEconomySource,
  parseStudentHeroSource,
  parseStudentMedalSource,
  parseStudentPracticeSource,
  parseTeacherPreparation,
  studentBoardData,
} from '../../../src/shared/domain/studentBoard.ts';

type Environment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALLOWED_ORIGINS?: string;
};
const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';
const bossHints: Record<string, string> = {
  BOSS_01: '상대는 물리 공격을 주로 사용해요. 잎사귀 수호자가 방어에 유리해요.',
  BOSS_02: '상대는 마법 공격을 주로 사용해요. 별빛 요정이 방어에 유리해요.',
  BOSS_03: '상대는 마법 공격을 주로 사용해요. 별빛 요정이 방어에 유리해요.',
  BOSS_04: '상대는 물리 공격을 주로 사용해요. 잎사귀 수호자가 방어에 유리해요.',
  BOSS_05:
    '상대는 물리와 마법 공격을 고르게 사용해요. 두 방어 병력을 균형 있게 준비해요.',
};
export function createBoardHandler(env: Environment, fetcher: typeof fetch = fetch) {
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
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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
    if (!['GET', 'POST'].includes(request.method))
      return respond({ error: 'Method not allowed' }, 405);
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)
      return respond({ error: 'Server not configured' }, 503);
    const rest = async (path: string, init: RequestInit = {}) =>
      fetcher(`${env.SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    const url = new URL(request.url);
    try {
      let value: unknown;
      if (request.method === 'POST') {
        if (Number(request.headers.get('content-length') ?? 0) > 300000)
          return respond({ error: 'Payload too large' }, 413);
        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > 300000)
          return respond({ error: 'Payload too large' }, 413);
        try {
          value = JSON.parse(raw);
        } catch {
          return respond({ error: 'Invalid JSON' }, 400);
        }
      }
      if (request.method === 'GET' && url.searchParams.has('token')) {
        const token = url.searchParams.get('token');
        if (!isUuid(token)) return respond({ error: 'Not found' }, 404);
        const response = await rest(
          `student_boards?token=eq.${token}&select=payload,owner_id,publication_id,team_index&limit=1`,
        );
        if (!response.ok) return respond({ error: 'Read unavailable' }, 503);
        const rows = await response.json();
        if (!Array.isArray(rows) || !object(rows[0]))
          return respond({ error: 'Not found' }, 404);
        const board = parseStudentBoard(rows[0].payload);
        if (
          !isUuid(rows[0].owner_id) ||
          !isUuid(rows[0].publication_id) ||
          !Number.isInteger(rows[0].team_index)
        )
          return respond(board);
        const boardOwner = rows[0].owner_id;
        const publicationId = rows[0].publication_id;
        const boardTeam = rows[0].team_index;
        const seasonIndex = board.seasonNumber - 1;
        const rewards = await rest(
          `hero_reward_tokens?owner_id=eq.${boardOwner}&expedition_id=eq.${publicationId}&team_index=eq.${boardTeam}&season_index=eq.${seasonIndex}&select=reward_id,hero_id,revealed_at,achieved_at&order=achieved_at.asc,reward_id.asc`,
        );
        if (!rewards.ok) return respond({ error: 'Hero read unavailable' }, 503);
        const rewardRows: unknown = await rewards.json();
        if (!Array.isArray(rewardRows))
          return respond({ error: 'Hero read unavailable' }, 503);
        const heroes = rewardRows.flatMap((reward, index) =>
          object(reward) &&
          typeof reward.hero_id === 'string' &&
          /^H(0[1-9]|1[0-5])$/.test(reward.hero_id)
            ? [
                {
                  slot: index + 1,
                  revealed:
                    typeof reward.revealed_at === 'string' &&
                    Number.isFinite(Date.parse(reward.revealed_at)),
                  ...(typeof reward.revealed_at === 'string'
                    ? { heroId: reward.hero_id }
                    : {}),
                  rewardId: typeof reward.reward_id === 'string' ? reward.reward_id : '',
                  revealedAt:
                    typeof reward.revealed_at === 'string' ? reward.revealed_at : '',
                },
              ]
            : [],
        );
        const latestReveal = heroes
          .filter((hero) => hero.revealed && hero.rewardId && hero.revealedAt)
          .sort((left, right) => right.revealedAt.localeCompare(left.revealedAt))[0];
        const accountResponse = await rest(
          `student_team_accounts?owner_id=eq.${boardOwner}&expedition_id=eq.${publicationId}&team_index=eq.${boardTeam}&season_index=eq.${seasonIndex}&select=earned_points,teacher_spent_points,base_inventory,base_hint_purchased,hint_text&limit=1`,
        );
        if (!accountResponse.ok) return respond({ error: 'Shop read unavailable' }, 503);
        const accountRows: unknown = await accountResponse.json();
        const account =
          Array.isArray(accountRows) && object(accountRows[0]) ? accountRows[0] : null;
        let dynamicEconomy = board.economy;
        if (account) {
          const purchasesResponse = await rest(
            `student_team_purchases?owner_id=eq.${boardOwner}&expedition_id=eq.${publicationId}&team_index=eq.${boardTeam}&season_index=eq.${seasonIndex}&select=item_id,price`,
          );
          if (!purchasesResponse.ok)
            return respond({ error: 'Shop read unavailable' }, 503);
          const purchaseRows: unknown = await purchasesResponse.json();
          if (!Array.isArray(purchaseRows))
            return respond({ error: 'Shop read unavailable' }, 503);
          const baseInventory = object(account.base_inventory)
            ? account.base_inventory
            : {};
          const unitIds = ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04'] as const;
          const studentSpent = purchaseRows.reduce(
            (sum, purchase) =>
              sum +
              (object(purchase) && Number.isInteger(purchase.price)
                ? Number(purchase.price)
                : 0),
            0,
          );
          const hintPurchased =
            account.base_hint_purchased === true ||
            purchaseRows.some(
              (purchase) => object(purchase) && purchase.item_id === 'BOSS_HINT',
            );
          dynamicEconomy = {
            earnedPoints: Number(account.earned_points),
            teacherSpentPoints: Number(account.teacher_spent_points) + studentSpent,
            balance:
              Number(account.earned_points) -
              Number(account.teacher_spent_points) -
              studentSpent,
            inventory: Object.fromEntries(
              unitIds.map((itemId) => [
                itemId,
                Number(baseInventory[itemId] ?? 0) +
                  purchaseRows.filter(
                    (purchase) => object(purchase) && purchase.item_id === itemId,
                  ).length,
              ]),
            ),
            hintPurchased,
            ...(hintPurchased && typeof account.hint_text === 'string'
              ? { hint: account.hint_text }
              : {}),
          };
        }
        return respond(
          parseStudentBoard({
            ...board,
            heroes: heroes.map(({ slot, revealed, heroId }) => ({
              slot,
              revealed,
              ...(revealed && heroId ? { heroId } : {}),
            })),
            ...(latestReveal?.heroId
              ? {
                  heroReveal: {
                    eventId: latestReveal.rewardId,
                    slot: latestReveal.slot,
                    heroId: latestReveal.heroId,
                    startedAt: latestReveal.revealedAt,
                  },
                }
              : { heroReveal: undefined }),
            ...(dynamicEconomy ? { economy: dynamicEconomy } : {}),
          }),
        );
      }
      if (origin && !allowed.has(origin))
        return respond({ error: 'Forbidden origin' }, 403);
      if (
        object(value) &&
        value.action === 'reveal-hero' &&
        isUuid(value.token) &&
        Number.isInteger(value.slot) &&
        Number(value.slot) >= 1 &&
        Number(value.slot) <= 15
      ) {
        const revealResponse = await rest('rpc/reveal_student_hero_authority', {
          method: 'POST',
          body: JSON.stringify({ p_token: value.token, p_slot: value.slot }),
        });
        if (!revealResponse.ok) return respond({ error: 'Hero reveal unavailable' }, 409);
        return respond({ reveal: await revealResponse.json() });
      }
      if (
        object(value) &&
        value.action === 'purchase' &&
        isUuid(value.token) &&
        isUuid(value.requestId) &&
        ['UNIT_01', 'UNIT_02', 'UNIT_03', 'UNIT_04', 'BOSS_HINT'].includes(
          String(value.itemId),
        )
      ) {
        const purchaseResponse = await rest('rpc/purchase_student_team_item', {
          method: 'POST',
          body: JSON.stringify({
            p_token: value.token,
            p_request_id: value.requestId,
            p_item_id: value.itemId,
          }),
        });
        if (!purchaseResponse.ok) {
          const detail = await purchaseResponse.text();
          const code = detail.includes('Insufficient points')
            ? 'INSUFFICIENT_POINTS'
            : detail.includes('Hint already purchased')
              ? 'HINT_ALREADY_PURCHASED'
              : detail.includes('Season already closed')
                ? 'SEASON_CLOSED'
                : 'PURCHASE_UNAVAILABLE';
          return respond({ error: 'Purchase unavailable', code }, 409);
        }
        return respond({ purchase: await purchaseResponse.json() });
      }
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
      if (!authUser || typeof authUser !== 'object' || !isUuid(authUser.id))
        return respond({ error: 'Unauthorized' }, 401);
      if (request.method === 'GET') return respond({ error: 'Method not allowed' }, 405);
      if (
        object(value) &&
        value.action === 'list-purchases' &&
        isUuid(value.expeditionId)
      ) {
        const purchaseResponse = await rest(
          `student_team_purchases?owner_id=eq.${authUser.id}&expedition_id=eq.${value.expeditionId}&select=request_id,team_index,season_index,item_id,price,purchased_at&order=purchased_at.asc,request_id.asc`,
        );
        if (!purchaseResponse.ok)
          return respond({ error: 'Purchase read unavailable' }, 503);
        const purchases: unknown = await purchaseResponse.json();
        if (!Array.isArray(purchases))
          return respond({ error: 'Purchase read unavailable' }, 503);
        return respond({
          purchases: purchases.flatMap((purchase) =>
            object(purchase)
              ? [
                  {
                    requestId: purchase.request_id,
                    teamIndex: purchase.team_index,
                    seasonIndex: purchase.season_index,
                    itemId: purchase.item_id,
                    price: purchase.price,
                    purchasedAt: purchase.purchased_at,
                  },
                ]
              : [],
          ),
        });
      }
      if (!object(value) || !('plan' in value))
        return respond({ error: 'Invalid request' }, 400);
      let plan;
      let heroes;
      let medals;
      let practice;
      let economy;
      try {
        plan = parseTeacherPreparation(value.plan);
        heroes =
          'heroes' in value && value.heroes !== undefined
            ? parseStudentHeroSource(value.heroes, plan.id)
            : undefined;
        medals =
          'medals' in value && value.medals !== undefined
            ? parseStudentMedalSource(value.medals, plan.id)
            : undefined;
        practice =
          'practice' in value && value.practice !== undefined
            ? parseStudentPracticeSource(value.practice, plan.id)
            : undefined;
        economy =
          'economy' in value && value.economy !== undefined
            ? parseStudentEconomySource(value.economy, plan.id)
            : undefined;
      } catch {
        return respond({ error: 'Invalid preparation or heroes' }, 400);
      }
      if (!('action' in value) || value.action !== 'publish')
        return respond({ error: 'Invalid action' }, 400);
      const time = new Date().toISOString();
      const boards = plan.teams.map((_, index) =>
        studentBoardData(plan, index, time, { heroes, medals, practice, economy }),
      );
      const response = await rest('rpc/publish_student_boards_v2', {
        method: 'POST',
        body: JSON.stringify({
          p_owner_id: authUser.id,
          p_publication_id: plan.id,
          p_preparation: plan,
          p_boards: boards,
          p_rotate: 'rotate' in value && value.rotate === true,
        }),
      });
      if (!response.ok) return respond({ error: 'Publish unavailable' }, 503);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length !== boards.length)
        return respond({ error: 'Invalid publish response' }, 503);
      const accounts = boards.flatMap((board) =>
        board.economy
          ? [
              {
                teamIndex: board.teamIndex,
                seasonIndex: board.seasonNumber - 1,
                earnedPoints: board.economy.earnedPoints,
                teacherSpentPoints: board.economy.teacherSpentPoints,
                inventory: board.economy.inventory,
                hintPurchased: board.economy.hintPurchased,
                hintText:
                  board.economy.hint ??
                  bossHints[plan.seasons[board.seasonNumber - 1]?.bossId] ??
                  '힌트를 확인할 수 없어요.',
              },
            ]
          : [],
      );
      if (accounts.length === boards.length) {
        const accountResponse = await rest('rpc/sync_student_team_accounts', {
          method: 'POST',
          body: JSON.stringify({
            p_owner_id: authUser.id,
            p_expedition_id: plan.id,
            p_accounts: accounts,
          }),
        });
        if (!accountResponse.ok)
          return respond({ error: 'Shop publish unavailable' }, 503);
      }
      return respond({
        links: rows.map((row) => ({
          teamIndex: row.team_index,
          teamName: parseStudentBoard(row.payload).teamName,
          token: row.token,
        })),
      });
    } catch {
      return respond({ error: 'Service unavailable' }, 503);
    }
  };
}
