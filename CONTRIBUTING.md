# Developer handoff

## Source map

| Path | Responsibility |
| --- | --- |
| `web/src/main.tsx` and `web/src/data.ts` | PM stage and checklist UI, source inventory and intake instructions, GitHub collection, browser plan state |
| `web/src/DepartmentsApp.tsx` and `web/shared/departments.json` | Department UI, mandates, workflows, partner rules and starter tasks |
| `web/server/index.mjs`, `github.mjs`, and `departments.mjs` | Loopback HTTP host, approved private-repo intake and file persistence |
| `web/server/department-core.mjs` | Domain logic shared by Node and the Cloudflare Worker: tasks, messages, run reconciliation, reviews, notes, handoffs |
| `web/server/runtimes.mjs` | Sim v2 execution and receipt polling; Lobu session, event stream and response correlation |
| `web/cloudflare/` and `web/wrangler.toml` | Existing synthetic preview and its browser-scoped Durable Object |
| `integrations/sim/` and `integrations/lobu/` | Workflow JSONs, input/output briefs, specialist instructions, evaluation cases and desired state |
| `tools/` and `web/public/` | Rebuild helpers and static downloads referenced by the portal |

## Test and review

- Run `npm ci`, `npm run build`, `npm test`, and `npm run build:cloudflare` in `web/`. Tests exercise the portal and mock runtime protocols; a passing build does not prove live provider behavior.
- Run `npm ci --ignore-scripts` and `npm run validate` in `integrations/lobu/` to validate all nine role definitions. Verify the exact deployment release and its provider/policy configuration separately.
- Use `web/cloudflare/smoke.mjs` only against an authorised synthetic preview. It writes synthetic work items, conversations and drafts in isolated preview sessions.
- Keep draft review bound to the exact saved output hash. Never retry an uncertain Sim start before reconciling its run ID. Do not log or check in company content, runtime tokens or session stores.

## Next milestone

1. Set up a pinned private Sim deployment and import the Sales proposal starter. Execute with synthetic data; verify completion, receipt reconciliation and draft review.
2. Set up a pinned private Lobu deployment and run the Sales specialist with an approved model. Verify persistence, one correlated reply, and that restricted tools cannot be used.
3. Before employee access, implement and test verified identity, tenant and engagement permissions, scoped session keys, durable team storage and backups. The existing local Lobu adapter is a single-operator pilot.
4. Add source retrieval only after approving the corpus and the end-to-end storage, embedding, retrieval, inference and logging routes. Require exact citations and negative access tests before enabling real data. The GitHub intake path is not an indexing pipeline.
5. Expand the remaining leads and workflows after the first path is accepted. Record quality, latency, cost, review effort and rework on representative tasks.

Keep `RUNTIME_EGRESS_APPROVED=false` in development unless the operator approves the destinations and data. See `web/.env.example` for the server configuration. Use `integrations/lobu/.env.example` for model settings. Never place real values in examples or browser bundles.

The Cloudflare configuration names the existing preview. Use a separate Worker/account configuration for new environments. Run a local dry run and obtain the preview owner's approval before publishing changes to their existing Worker. This repository has no automatic deploy workflow.

## Regenerate supporting files

- `node tools/build_runtime_starter.mjs` regenerates starter definitions from the shared catalogue. Run in a disposable checkout, then review changes before replacing edited role/workflow files.
- `python3 tools/package_runtime_starter.py` regenerates the downloadable starter ZIP and copies the two runtime notes into `web/public/integrations/`. It packages only known source formats and role documents.
- `python3 tools/build_pdfs.py` regenerates the historical guide set with ReportLab. On non-macOS systems set `SUPERBRAIN_PDF_FONT_DIR` to a folder containing `Arial Unicode.ttf` and `Arial Bold.ttf`. The current rebuild PDF is supplied in `output/pdf/`. `python3 tools/pdf_qa.py` uses Pillow, pypdf, and Poppler to render QA contact sheets.
- `node tools/build_discovery_template.cjs` regenerates the editable discovery DOCX. It requires TypeScript installed under `web/` and `docx` installed at the repo root. Copy the reviewed output into the templates folders before publishing.
