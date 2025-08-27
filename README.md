# Cloudflare Worker: Get into Google

This worker offers a tiny interface and JSON API that walk a site owner through connecting a Google account, verifying ownership, onboarding a property into Search Console, submitting sitemaps and inspecting URLs.

It is deliberately minimal and friendly. Each step returns human‑readable summaries and safe defaults so users can repeat steps without worry.

## Deploying

1. Install [`wrangler`](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
2. Create a Google OAuth client and note the client ID/secret.
3. Bind a KV namespace named `TOKENS` for storing user tokens.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your worker environment.
5. Run `wrangler publish`.

## Using

Visit the worker URL. The page invites you to connect a Google account. After OAuth completes, simple controls appear to fetch a DNS verification token, confirm verification, request URL indexing, submit a sitemap, and bulk index every URL in a sitemap with progress feedback. The same operations are also available via JSON endpoints:

- `POST /api/verify` to receive a verification token.
- `POST /api/confirm` once the token is placed.
- `POST /api/property` to add the site to Search Console.
- `POST /api/sitemap` to submit a sitemap.
- `POST /api/url` for URL inspection.
- `POST /api/reindex` to request special indexing (eligible content only).

Responses follow a consistent envelope:

```json
{
  "success": true,
  "summary": "Short message",
  "details": { /* raw API data */ }
}
```

## Observability

Every request can log a request ID. Avoid logging secrets; redact tokens before writing diagnostic messages.

## Health check

A simple `GET /` returns the static helper page. Future checks may ping `/api/state` for JSON health.
