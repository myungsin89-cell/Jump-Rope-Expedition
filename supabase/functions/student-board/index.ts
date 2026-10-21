import { createBoardHandler } from './handler.ts';

Deno.serve(
  createBoardHandler({
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    ALLOWED_ORIGINS: Deno.env.get('ALLOWED_ORIGINS'),
  }),
);
