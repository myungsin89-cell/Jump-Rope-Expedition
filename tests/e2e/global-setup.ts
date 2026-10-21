import { createServer } from 'vite';

export default async function globalSetup() {
  process.env.VITE_BOARD_API_URL = 'http://127.0.0.1:9999/functions/v1/student-board';
  process.env.VITE_AUTH_TEST_BYPASS = 'true';
  process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9998';
  process.env.VITE_SUPABASE_ANON_KEY = 'e2e-public-anon-key';
  const server = await createServer({
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  });

  await server.listen();

  return async () => {
    await server.close();
  };
}
