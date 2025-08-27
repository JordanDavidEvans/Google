import { describe, it, expect } from 'vitest';
import { handleRequest } from '../src/routes';

describe('handleRequest', () => {
  it('renders UI at root path', async () => {
    const env = { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' } as any;
    const req = new Request('https://example.com/', { method: 'GET' });
    const res = await handleRequest(req, env, {} as any);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('Welcome');
  });

  it('returns 404 for unknown path', async () => {
    const env = { GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' } as any;
    const req = new Request('https://example.com/unknown', { method: 'GET' });
    const res = await handleRequest(req, env, {} as any);
    expect(res.status).toBe(404);
  });
});
