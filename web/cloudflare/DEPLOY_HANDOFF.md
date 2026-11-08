# ethikcorp-superbrain deployment handoff

This package is a tested build of the existing Worker. It was not deployed. It contains no Cloudflare token, no `SESSION_SECRET`, and no local `.data` store.

Source commit: `48d92ba94a1799a3a6cfbecaca05222c058caee8`  
Built: 2026-11-08T19:41:33Z  
Node: v22.23.4  
Wrangler used to bundle: 4.151.0  
Tests before the build: 22 passed, 0 failed (`npm test` in `web/`)

## What to leave alone

Read the live script settings before uploading. On 8 November 2026 a read of `GET /accounts/80114e86d2b31e6086ffa21c0ecda3ec/workers/scripts/ethikcorp-superbrain/settings` showed:

| Binding | Live value to preserve |
| --- | --- |
| `ASSETS` | assets binding |
| `PREVIEW_WORKSPACES` | Durable Object class `PreviewWorkspace`, namespace `52135fb6013244208cf1004c41aa9187` |
| `BUILD_ID` | plain text `2026-10-30-google-bridge-preview` |
| `SESSION_SECRET` | secret text is present. The value was not read and is not in this package. |

Compatibility date `2026-10-19` and flag `nodejs_compat` already match the repository. `logpush` was false.

Do not send a migrations block. The repository `wrangler.toml` still lists migration tag `v1` with `new_sqlite_classes = ["PreviewWorkspace"]`. Sending that again can be treated as a new migration. Omit `migrations`. Do not rename or delete `PreviewWorkspace`. Do not create a new namespace. Workspace rows live in that namespace's SQLite. A code update of the same class does not require a migration and does not reset storage.

Do not put `SESSION_SECRET` in the upload. Keep it with `keep_bindings: ["secret_text"]`. Replacing the secret signs out every existing browser workspace.

`wrangler.toml` in the repository sets `BUILD_ID` to `2026-10-25-cloudflare-v1`. That is not the live value. `npx wrangler deploy` without `--keep-vars` would overwrite the live plain-text binding. The metadata in this package keeps the live `BUILD_ID`. Change it only after inspecting settings, if a new health string is wanted.

## Files

| Path | Role |
| --- | --- |
| `worker/worker.js` | Bundled ES module. Wrangler `--dry-run --outdir` output. Upload as `main_module`. |
| `assets/` | Static files from `web/dist` after `npm run build:cloudflare`. 26 files. |
| `metadata/asset-manifest.json` | Path, Cloudflare asset hash, and size for the upload session. |
| `metadata/script-upload.json` | Multipart metadata. The `assets.jwt` placeholder must be replaced with the completion token. |
| `metadata/live-settings-observed.json` | Redacted settings read. No secret values. |
| `metadata/wrangler.toml` | Repository config. Do not deploy it blindly; see the `BUILD_ID` warning. |
| `SHA256SUMS` | SHA-256 of `worker/worker.js` and every file under `assets/`. |

The Worker bundle contains the localhost-only fallback string `local-cloudflare-preview-only-secret-not-for-deployment`. The code uses it only for `http://127.0.0.1` and `http://localhost`. It is not the production secret.

## Upload order

Account `80114e86d2b31e6086ffa21c0ecda3ec`. Script name `ethikcorp-superbrain`.

1. Save the current script and settings. `GET /accounts/{account_id}/workers/scripts/ethikcorp-superbrain` and `GET .../settings`. That download is the rollback copy. Do not commit it.
2. `POST /accounts/{account_id}/workers/scripts/ethikcorp-superbrain/assets-upload-session` with `Content-Type: application/json` and body `{ "manifest": <metadata/asset-manifest.json> }`.
3. The result has `jwt` and `buckets`. `buckets` is an array of arrays of asset hashes. The session JWT is an upload credential. Do not log it or store it in git.
4. For each bucket, `POST /accounts/{account_id}/workers/assets/upload?base64=true` with `Authorization: Bearer <session jwt>`. The body is `multipart/form-data`. Each part's name is the asset hash. The part body is the file contents encoded as base64, and the part content type is the file's type, or `application/null` when there is none. Wrangler 4.151.0 does this.
5. If `buckets` is empty, the session `jwt` is already the completion token. Otherwise the upload response's `jwt` is the completion token. Use the token from the last successful bucket response.
6. `PUT /accounts/{account_id}/workers/scripts/ethikcorp-superbrain` as `multipart/form-data`:
   - Part `metadata`, content type `application/json`, body from `metadata/script-upload.json` with `assets.jwt` set to the completion token.
   - Part `worker.js`, content type `application/javascript+module`, body `worker/worker.js`.
   The part filename must be `worker.js`, matching `main_module`.
7. Do not add `?bindings_inherit` unless you have checked inherit bindings. This script has none.
8. Confirm `GET .../settings` still shows namespace `52135fb6013244208cf1004c41aa9187` and a `SESSION_SECRET` secret binding. Confirm `/api/health` returns `ok: true`, `storage: sqlite-durable-object`, and `liveRuntimes: false`.

Asset hashes are the first 32 hex characters of Blake3 over the base64 file bytes plus the extension without the dot. That is Wrangler 4.151.0's manifest rule. SHA-256 in `SHA256SUMS` is a separate integrity check and is not the upload hash.

## Rollback

If the new version misbehaves, upload the script body and metadata saved in step 1. Do not run a migration, do not delete the Durable Object namespace, and do not rotate `SESSION_SECRET` as part of rollback. An existing browser cookie addresses `v1:<session id>` inside namespace `52135fb6013244208cf1004c41aa9187`. Those rows remain as long as that namespace and class name stay.

`node cloudflare/smoke.mjs https://ethikcorp-superbrain.aqionlabs.workers.dev` writes synthetic records only in the browser session it creates. It does not read other workspaces. Run it only when a synthetic write in a new session is acceptable.

## What this environment did not do

No deploy, no secret read, no binding edit, no migration, and no copy of `web/.data`.
