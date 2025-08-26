import { renderUI } from './ui';
import { Env } from './types';

export async function handleRequest(request: Request, _env: Env, _ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/' && request.method === 'GET') {
    return renderUI();
  }
  return new Response('Not found', { status: 404 });
}
