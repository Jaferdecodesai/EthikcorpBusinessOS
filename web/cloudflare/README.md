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

The public preview has no GitHub token, Sim/Lobu key, model provider, company-source retrieval or employee identity integration. Its runtime route is intentionally unconfigured. It is a global front end. It does not certify UAE data residency, and offline operation is not a requirement. The local private-repository connector remains available separately.

## Publishing the established Worker

`wrangler.toml` is the original first-create file. It still has migration tag `v1` and `BUILD_ID = "2026-10-25-cloudflare-v1"`. Do not run `wrangler deploy` against that file for the Worker that is already live. That would resend the migration and replace the live `BUILD_ID`.

The update command is `npm run cloudflare:publish-established`. It uses `wrangler.established.toml`, which has no migrations block and sets `BUILD_ID` to the live value `2026-10-30-google-bridge-preview`. `--keep-vars` is set so vars that are not in the file are not deleted. Wrangler keeps existing secrets, including `SESSION_SECRET`, unless a secret command is run. Do not run `wrangler secret put SESSION_SECRET`.

The Durable Object binding stays `PREVIEW_WORKSPACES` / `PreviewWorkspace`. The live namespace id is `52135fb6013244208cf1004c41aa9187`. This config does not create a namespace and does not delete stored workspace rows.

There is no GitHub Actions deploy on push. `.github/workflows/publish-ethikcorp-superbrain.yml` runs only from the Actions “Run workflow” button, and only after the owner stores `CLOUDFLARE_API_TOKEN` as an Actions secret. Workers Builds is not connected to this Worker. Creating one needs a build token and a GitHub repository connection from the Cloudflare dashboard. Do not point that build at `wrangler.toml`.

This environment’s Wrangler is not signed in. `wrangler login` has to be completed by the account owner in a browser. Do not paste an API token into the repository.

API writes require the same origin and JSON, and stored preview state is capped at 2 MB per browser workspace. Worker logs are disabled by default. Do not enable real company integrations without the separately agreed identity, source permissions and hosting policy.
