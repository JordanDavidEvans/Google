import { ApiResponse, Env } from './types';
import { renderUI } from './ui';
import { authUrl, exchangeCode, getVerificationToken, verifySite, addProperty, submitSitemap, inspectUrl, requestIndexing } from './google';
import { TokenStore } from './storage';

function json<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const store = new TokenStore(env);

  if (url.pathname === '/' && request.method === 'GET') {
    return renderUI();
  }

  if (url.pathname === '/api/state') {
    const token = await store.get('user');
    return json({ success: true, summary: 'current state', details: { authed: !!token } });
  }

  if (url.pathname === '/api/oauth/start') {
    const state = crypto.randomUUID();
    // state should be stored to validate callback; omitted for brevity
    const redirect = new URL('/api/oauth/callback', url.origin).toString();
    const target = authUrl(env, state, redirect);
    return Response.redirect(target, 302);
  }

  if (url.pathname === '/api/oauth/callback') {
    const code = url.searchParams.get('code');
    const redirect = new URL('/api/oauth/callback', url.origin).toString();
    if (!code) return json({ success: false, summary: 'Missing code' }, 400);
    try {
      const tokens = await exchangeCode(env, code, redirect);
      await store.put('user', {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry: Date.now() + tokens.expires_in * 1000
      });
      return Response.redirect('/', 302);
    } catch (err) {
      return json({ success: false, summary: 'OAuth exchange failed' }, 500);
    }
  }

  if (url.pathname === '/api/verify' && request.method === 'POST') {
    const token = await store.get('user');
    if (!token) return json({ success: false, summary: 'Not authenticated' }, 401);
    const { site, type } = await request.json();
    const res = await getVerificationToken(token.access_token, site, type);
    return json(res);
  }

  if (url.pathname === '/api/confirm' && request.method === 'POST') {
    const token = await store.get('user');
    if (!token) return json({ success: false, summary: 'Not authenticated' }, 401);
    const { site, type } = await request.json();
    const res = await verifySite(token.access_token, site, type);
    return json(res);
  }

  if (url.pathname === '/api/property' && request.method === 'POST') {
    const token = await store.get('user');
    if (!token) return json({ success: false, summary: 'Not authenticated' }, 401);
    const { site } = await request.json();
    const res = await addProperty(token.access_token, site);
    return json(res);
  }

  if (url.pathname === '/api/sitemap' && request.method === 'POST') {
    const token = await store.get('user');
    if (!token) return json({ success: false, summary: 'Not authenticated' }, 401);
    const { site, sitemap } = await request.json();
    const res = await submitSitemap(token.access_token, site, sitemap);
    return json(res);
  }

  if (url.pathname === '/api/url' && request.method === 'POST') {
    const token = await store.get('user');
    if (!token) return json({ success: false, summary: 'Not authenticated' }, 401);
    const { site, url: target } = await request.json();
    const res = await inspectUrl(token.access_token, site, target);
    return json(res);
  }

  if (url.pathname === '/api/reindex' && request.method === 'POST') {
    const token = await store.get('user');
    if (!token) return json({ success: false, summary: 'Not authenticated' }, 401);
    const { url: target, eligible } = await request.json();
    if (!eligible) {
      return json({ success: false, summary: 'This content is not eligible for instant indexing. Keep sitemaps fresh and use internal links.' }, 400);
    }
    const res = await requestIndexing(token.access_token, target);
    return json(res);
  }

  return json({ success: false, summary: 'Not found' }, 404);
}
