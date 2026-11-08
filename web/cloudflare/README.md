# Cloudflare deployment

Both views share one Worker: `/#pm` and `/#departments`. `/pm` and `/departments` redirect to those views.

Use Node 22 or later for Wrangler. The npm Cloudflare scripts use a registry-provided Node 22 executable so the local Node 20 application can remain installed.

1. `npm install`
2. `npm test`
3. `npm run build:cloudflare`
4. `npm run cloudflare:dev` for local Workers/SQLite verification.
5. Configure `SESSION_SECRET` with `wrangler secret put SESSION_SECRET`. Keep its random value in the secret store, never in source or a frontend environment variable.
6. `npm run cloudflare:deploy`
7. `node cloudflare/smoke.mjs https://<worker-url>` checks the actual hosted application using synthetic inputs.

The Worker serves the built React assets and the existing department API through a SQLite-backed Durable Object. The shared domain logic also continues to support the local Node server and its original JSON store. Local `.data`, environment files and credentials are not deployment assets.

A signed, HttpOnly, Secure, SameSite cookie scopes each browser to its own cloud department workspace for up to 30 days. Keep that cookie to return to the same records. Clearing site data or changing browsers creates a separate workspace; this is not a shared employee account. PM checklist/source metadata remain in browser local storage. Export relevant plans and department workspaces before clearing browser data.

The public preview has no GitHub token, Sim/Lobu key, model provider, company-source retrieval or employee identity integration. Its runtime route is intentionally unconfigured. It is globally hosted and does not certify UAE data residency. The local private-repository connector remains available separately.

API writes require the same origin and JSON, and stored preview state is capped at 2 MB per browser workspace. Worker logs are disabled by default. Do not enable real company integrations without the separately agreed identity, source permissions and hosting policy.
