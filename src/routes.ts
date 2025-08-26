import { renderUI } from './ui';
import { Env } from './types';

export async function handleRequest(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/' && request.method === 'GET') {
    return renderUI(env);
  }
  return new Response('Not found', { status: 404 });
}
