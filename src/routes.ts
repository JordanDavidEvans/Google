import { renderUI } from './ui';
import { exchangeCode } from './google';
import { Env } from './types';

export async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/' && request.method === 'GET') {
    return renderUI(env);
  }
  if (url.pathname === '/api/token' && request.method === 'POST') {
    const { code, redirect_uri } = await request.json() as { code: string; redirect_uri: string };
    try {
      const data = await exchangeCode(env, code, redirect_uri);
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      return new Response('token exchange failed', { status: 500 });
    }
  }
  return new Response('Not found', { status: 404 });
}
