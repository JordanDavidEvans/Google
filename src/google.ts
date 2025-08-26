import { ApiResponse, Env } from './types';

const OAUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SITEVERIFICATION = 'https://www.googleapis.com/siteVerification/v1';
const SEARCH_CONSOLE = 'https://searchconsole.googleapis.com/v1';
const INDEXING = 'https://indexing.googleapis.com/v3';
const URL_INSPECTION = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

export function authUrl(env: Env, state: string, redirect: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirect,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/webmasters',
      'https://www.googleapis.com/auth/indexing',
      'https://www.googleapis.com/auth/siteverification'
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `${OAUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCode(env: Env, code: string, redirectUri: string) {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });
  const res = await fetch(TOKEN_ENDPOINT, { method: 'POST', body });
  if (!res.ok) throw new Error('token exchange failed');
  return res.json();
}

export async function refresh(env: Env, refresh_token: string) {
  const body = new URLSearchParams({
    refresh_token,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });
  const res = await fetch(TOKEN_ENDPOINT, { method: 'POST', body });
  if (!res.ok) throw new Error('refresh failed');
  return res.json();
}

// The following helpers call Google APIs. They return an ApiResponse envelope
// with high level summaries and raw details. Real workers should handle errors
// and retries; here we provide simplified versions.

export async function getVerificationToken(accessToken: string, site: string, type: 'DOMAIN' | 'URL_PREFIX'): Promise<ApiResponse> {
  const method = type === 'DOMAIN' ? 'DNS_TXT' : 'META';
  const res = await fetch(`${SITEVERIFICATION}/token?verificationMethod=${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: { identifier: site, type } })
  });
  if (!res.ok) return { success: false, summary: 'Failed to obtain token', details: await res.json() };
  const data = await res.json();
  return { success: true, summary: 'Token issued', details: data };
}

export async function verifySite(accessToken: string, site: string, type: 'DOMAIN' | 'URL_PREFIX'): Promise<ApiResponse> {
  const method = type === 'DOMAIN' ? 'DNS_TXT' : 'META';
  const res = await fetch(`${SITEVERIFICATION}/webResource?verificationMethod=${method}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: { identifier: site, type } })
  });
  if (!res.ok) return { success: false, summary: 'Verification failed', details: await res.json() };
  return { success: true, summary: 'Site verified', details: await res.json() };
}

export async function addProperty(accessToken: string, site: string): Promise<ApiResponse> {
  const res = await fetch(`${SEARCH_CONSOLE}/sites/${encodeURIComponent(site)}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return { success: false, summary: 'Property add failed', details: await res.json() };
  return { success: true, summary: 'Property added', details: await res.json() };
}

export async function submitSitemap(accessToken: string, site: string, sitemap: string): Promise<ApiResponse> {
  const res = await fetch(`${SEARCH_CONSOLE}/sites/${encodeURIComponent(site)}/sitemaps/${encodeURIComponent(sitemap)}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return { success: false, summary: 'Sitemap submission failed', details: await res.json() };
  return { success: true, summary: 'Sitemap submitted', details: await res.json() };
}

export async function inspectUrl(accessToken: string, site: string, url: string): Promise<ApiResponse> {
  const res = await fetch(URL_INSPECTION, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: site })
  });
  if (!res.ok) return { success: false, summary: 'Inspection failed', details: await res.json() };
  const data = await res.json();
  return { success: true, summary: 'Inspection complete', details: data };
}

export async function requestIndexing(accessToken: string, url: string): Promise<ApiResponse> {
  const res = await fetch(`${INDEXING}/urlNotifications:publish`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' })
  });
  if (!res.ok) return { success: false, summary: 'Indexing request failed', details: await res.json() };
  return { success: true, summary: 'Indexing notified', details: await res.json() };
}
