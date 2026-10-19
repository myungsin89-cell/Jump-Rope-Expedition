import {
  isUuid,
  parseStudentBoard,
  parseTeacherPreparation,
  studentBoardData,
} from '../../../src/shared/domain/studentBoard.ts';

type Environment = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CLASSROOM_OWNER_KEY?: string;
  ALLOWED_ORIGINS?: string;
};
async function sameSecret(a: string, b: string): Promise<boolean> {
  const digest = async (value: string) =>
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    );
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
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
            'Access-Control-Allow-Headers': 'content-type,x-classroom-owner-key',
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
      if (request.method === 'GET' && url.searchParams.has('token')) {
        const token = url.searchParams.get('token');
        if (!isUuid(token)) return respond({ error: 'Not found' }, 404);
        const response = await rest(
          `student_boards?token=eq.${token}&select=payload&limit=1`,
        );
        if (!response.ok) return respond({ error: 'Read unavailable' }, 503);
        const rows = await response.json();
        return Array.isArray(rows) && rows[0]
          ? respond(parseStudentBoard(rows[0].payload))
          : respond({ error: 'Not found' }, 404);
      }
      if (origin && !allowed.has(origin))
        return respond({ error: 'Forbidden origin' }, 403);
      if (!env.CLASSROOM_OWNER_KEY || env.CLASSROOM_OWNER_KEY.length < 32)
        return respond({ error: 'Owner publishing is not configured' }, 503);
      const key = request.headers.get('x-classroom-owner-key') ?? '';
      if (key.length > 512 || !(await sameSecret(key, env.CLASSROOM_OWNER_KEY)))
        return respond({ error: 'Unauthorized' }, 401);
      if (request.method === 'GET') {
        const id = url.searchParams.get('publicationId');
        if (id && !isUuid(id)) return respond({ error: 'Invalid ID' }, 400);
        const response = await rest(
          id
            ? `classroom_preparations?id=eq.${id}&select=preparation,updated_at&limit=1`
            : 'classroom_preparations?select=id,updated_at&order=updated_at.desc',
        );
        return response.ok
          ? respond(await response.json())
          : respond({ error: 'Backup unavailable' }, 503);
      }
      if (Number(request.headers.get('content-length') ?? 0) > 200000)
        return respond({ error: 'Payload too large' }, 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 200000)
        return respond({ error: 'Payload too large' }, 413);
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        return respond({ error: 'Invalid JSON' }, 400);
      }
      if (!value || typeof value !== 'object' || !('plan' in value))
        return respond({ error: 'Invalid request' }, 400);
      let plan;
      try {
        plan = parseTeacherPreparation(value.plan);
      } catch {
        return respond({ error: 'Invalid preparation' }, 400);
      }
      const time = new Date().toISOString();
      const boards = plan.teams.map((_, index) => studentBoardData(plan, index, time));
      const response = await rest('rpc/publish_student_boards', {
        method: 'POST',
        body: JSON.stringify({
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
