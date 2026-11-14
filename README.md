# Ethikcorp BusinessOS

Built by Aqionlabs.ai. This repository is the Ethikcorp company portal: BusinessBrain PM, the CEO BusinessBrain, and the department Businessbots.

## Run

Use Node.js 22.13 or newer.

```bash
cd web
npm ci
npm run dev
```

Open http://127.0.0.1:5052/#pm. The customer portal preview is `PORTAL_MODE=customer npm run dev`. The Aqion team preview is `PORTAL_MODE=aqionteam npm run dev`.

## Build and activate the BusinessBrain locally

```sh
cd web
npm ci
PORTAL_MODE=aqionteam BRAIN_LOCAL_DEVELOPMENT=true npm run dev
```

The workspace listens on loopback and saves its build state in `web/.data/brain.json`. Set `BRAIN_DATA_FILE` to use a separate file. The local workspace uses the developer role for the operator on that machine. The hosted preview uses its existing session modes and demo pipeline.

1. Open BusinessBrain PM and download the 18-source ownership workbook from Discovery & ownership. Complete and import it. The team demo includes a sample workbook and sample data under Collection & handoff.
2. Use `web/.env.example` to configure `web/.env.local`. Set a private GitHub repository and a fine-grained token with Contents read/write for it. Set the approved Drive folder ID and the OAuth client ID, client secret and refresh token for an account with write access to that folder. Restart the app after changing configuration.
3. Select a stage and use **Verify destination access** to check the private GitHub repository and branch, and the Drive folder's upload capability and permissions. The check creates no files. Select the intended retrieval audience and upload the approved file. Collection extracts text from Markdown, UTF-8 text, text-based PDFs and DOCX for the five pilot categories. It archives the original and indexes extracted text after both destinations succeed. Image-only PDFs need OCR before upload. Other stage files are archived as evidence. If one destination fails, submit the same file again to retry it. The receipt lists each destination independently.
4. Confirm the departments ready to activate, run the retrieval checks, then select **Deploy BusinessBrain**. This activates the release and its confirmed department bots locally. Ask from the BusinessBrain or from a confirmed bot's workspace to see cited passages. Source changes require a new retrieval check and release.

Use **Refresh & removal** to see which indexed source versions are serving and which are staged. Withdraw a source there to remove every indexed version from the active release immediately and record the operator and reason. GitHub and Drive retain their archived originals. To restore a withdrawn source, upload it through Collection with a new owner approval reference, run retrieval checks, and deploy the new release.

In **Collection & handoff**, select a CSV upload type and download its template. The portal validates the selected schema, numeric fields, and unique row keys before archiving. A successful upload replaces that table's snapshot. BusinessBrain shows the source file and row count and calculates KPIs from the uploaded snapshots. Executive chat can calculate total revenue, weighted pipeline, and utilisation from those same tables. Knowledge documents and the held-out retrieval evaluation support the cited department assistants.

**Remove all uploaded data** clears the intake, analytics, and release while preserving department work records and confirmations. **Business reset**, at the bottom of PM, also clears confirmations, tasks, drafts, automations, and departmental records. Both reset actions require typing `RESET`. The next build starts in uploaded-data mode, and the original archives remain in GitHub and Drive.

Private retrieval returns cited passages directly. To tune ranking, upload a JSONL question suite in **Evaluation**. Rows with `split: "calibration"` select the ranking profile. The separate `validation` rows check that profile before release. Each row names an expected top document or uses `null` to expect a refusal. An optional department ID runs the case through that bot's source scope. Validation is required in the shared team workspace.

```jsonl
{"question":"What are the approved proposal steps?","expectedDocument":"proposal-process.md","department":"sales","split":"calibration"}
{"question":"Who approves a proposal?","expectedDocument":"proposal-process.md","department":"sales","split":"validation"}
{"question":"What is the sales approval code?","expectedDocument":null,"department":"finance","split":"validation"}
```

The fine-tuning stage accepts evidence for external adapter training. The demo corpus can validate sample instruction pairs.

An approved Azure OpenAI deployment can optionally synthesize cited answers. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and `AZURE_OPENAI_DEPLOYMENT` for a deployment that supports Structured Outputs. Enable `BRAIN_MODEL_EGRESS_APPROVED` only after approving that deployment's data processing. The portal sends the question and up to three snippets from the caller's scoped release. It checks citation indices, verbatim supporting quotes, and cited numbers. Unavailable or invalid model responses fall back to cited passages. The deployment type determines inference geography. [Azure Structured Outputs](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/structured-outputs) · [Azure deployment types and data processing](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/deployment-types).

Connector APIs: [GitHub repository contents](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents) and [Drive file uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

## Shared team workspace

Build the standard Node portal with `npm ci` and `npm run build` in `web`. Start one production Node process with `npm run start:team` and a persistent volume for the brain and department stores. The process binds to `127.0.0.1`. Provide the private storage integration settings and these additional server-side settings in the host environment.

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `BRAIN_TEAM_ORIGIN` | Exact HTTPS origin of the team portal, such as `https://businessos.example.com` |
| `BRAIN_ACCESS_ISSUER` | Cloudflare Access team issuer, such as `https://example.cloudflareaccess.com` |
| `BRAIN_ACCESS_AUDIENCE` | Audience tag of the self-hosted Access application |
| `BRAIN_TEAM_ROSTER` | JSON mapping verified work emails to roles and, for heads, their department ID |
| `BRAIN_DATA_FILE` | Absolute path to the persistent file for the shared brain, releases and handoff receipts |
| `DEPARTMENT_STORE_PATH` | Distinct absolute path to the persistent file for tasks, drafts and reviews |

### Cloudflare-hosted team portal

The team portal can run on Cloudflare Workers with its workspace stored in a SQLite Durable Object. Use `web/wrangler.businessos.toml` for this deployment. It shares the Node portal's team API and uses the standard frontend build.

1. In the Cloudflare account that owns the domain, create a self-hosted Access application for the exact BusinessOS hostname. Limit its Allow policy to the approved team emails. Record the Access application audience and issuer.
2. From `web`, run `npm ci`, `npm test`, and `npm run build` with Node 22. Verify the logged-in account with `npx wrangler whoami` and validate packaging with `npx wrangler deploy --dry-run --config wrangler.businessos.toml`.
3. Configure `BRAIN_ACCESS_AUDIENCE` and `BRAIN_TEAM_ROSTER` as Worker secrets. Use the roles listed above. Configure the GitHub and Google Drive connector secrets and approved destination IDs before testing private uploads.
4. Deploy the Worker with `npx wrangler deploy --config wrangler.businessos.toml --keep-vars` and verify the exact BusinessOS custom domain listed in the configuration. The configuration disables public preview and workers.dev addresses. Check the Access redirect before signing in, then confirm the team build with `/api/health`. Use a separate workspace to test reset.


Example roster shape: `{"builder@example.com":{"role":"dev"},"ceo@example.com":{"role":"ceo"},"sales@example.com":{"role":"head","department":"sales"}}`.

Set up Cloudflare Access for the entire hostname and connect it to the loopback origin using a tunnel. Preserve the external Host header. The Node origin verifies the Access signature, issuer, audience and expiration on every request. Developers build and deploy. The CEO sees the business overview, assigns tasks, and validates custom automation definitions. Department heads can propose automations, manage pending tasks, and prepare reviewable drafts in their assigned workspace. CEO-approved custom automations can produce local drafts. The authenticated account is recorded as the reviewer.

GitHub and Drive enforce their own permissions on archived originals and citation links. Keep archive access scoped to the approved readers for the files stored there.

Keep the hosted Node build separate from the sample Workers. Verify the configured deployment with a developer, a CEO, and two department accounts before using real source files. [Cloudflare self-hosted Access setup](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) · [Cloudflare token verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## Deploy to Hostinger

Create a **Node.js Web App** in hPanel. Connect this repository and select the `codex/businessos-mvp` branch, or upload the Hostinger ZIP with `package.json` at the archive root.

| hPanel setting | Value |
| --- | --- |
| Framework preset | Other |
| Node.js | 22.x |
| Root directory | `web` for GitHub or the archive root for ZIP upload |
| Package manager | npm |
| Build command | `npm run build` |
| Output directory | `dist` |
| Entry file | `app.cjs` |

Before deploying, add the team origin, Access issuer, Access application audience, and team roster from the Shared team workspace table above. The team origin must match the public HTTPS hostname served through Cloudflare Access. Add the GitHub and Drive settings from `.env.example` in hPanel to enable uploads.

Set `BRAIN_DATA_FILE` and `DEPARTMENT_STORE_PATH` to distinct absolute paths in a private, writable directory that persists across deployments. Use a directory outside `hbuilds` and `public_html`. The app uses the port assigned by the host. After deploying, sign in at the team hostname and open `/api/health` to confirm it reports `"mode":"team"`. Verify both upload destinations from BusinessBrain PM before importing business files.

[Hostinger Node.js deployment](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) · [Hostinger environment variables](https://www.hostinger.com/support/how-to-add-environment-variables-during-node-js-application-deployment/)

## Test

```bash
cd web
npm test
```

## Deploy

The existing live worker `ethikcorp-superbrain` deploys from `cursor/superbrain-design-directions-83a1` with `npx wrangler deploy --config wrangler.established.toml --keep-vars`. Do not point that command at `wrangler.customer.toml` or `wrangler.aqionteam.toml`.

The two new portals are separate workers. Each has its own Durable Object (`PreviewWorkspace`, migration `v1`) and its own `SESSION_SECRET`. Never commit a secret or a `.dev.vars` file.

```bash
cd web
printf '%s' "$CUSTOMER_SESSION_SECRET" | npx wrangler secret put SESSION_SECRET --config wrangler.customer.toml
printf '%s' "$AQIONTEAM_SESSION_SECRET" | npx wrangler secret put SESSION_SECRET --config wrangler.aqionteam.toml
npx wrangler deploy --config wrangler.customer.toml
npx wrangler deploy --config wrangler.aqionteam.toml
```

Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` first. `.github/workflows/deploy-portals.yml` runs those deploys on a push to `main`.

Workers Builds alternative, one build per worker: root directory `web`, build command `npm ci && npm test && npm run build:cloudflare`, deploy command `npx wrangler deploy --config wrangler.customer.toml` or `npx wrangler deploy --config wrangler.aqionteam.toml`. Add an AI binding named `AI`.

`PORTAL_MODE=customer` keeps BusinessBrain and Businessbots locked until Step 1, the 18-source ownership workbook, is imported and valid. The server then starts the build. That portal never issues a development view or the pipeline APIs. `PORTAL_MODE=aqionteam` serves the full dev view only after a team invite. Immediately after deploy, from a private machine:

```bash
curl -s -c /tmp/team.cookies -X POST https://ethikcorp-businessos-aqionteam.<account>.workers.dev/api/session
curl -s -c /tmp/team.cookies -b /tmp/team.cookies -X POST https://ethikcorp-businessos-aqionteam.<account>.workers.dev/api/brain/bootstrap-dev -H 'content-type: application/json' -d '{}'
```

The response URL is the one-time Aqion team invite. Share it only with the team. A later call returns 409. On the team portal, Step 1 can also be completed with “Use the demo ownership sample”. The customer portal accepts only the real workbook.

# AqionLLM

Aqion Superbrain, with Ethikcorp as the first pilot. Businessbots is the department module. The active architecture is **Superbrain PM and department workspaces + Sim workflows + Lobu department leads**. This repository contains the restored pre-Google portal, editable docs, runtime starter files, and blank client intake templates.

## Run the preview

Use Node.js 22 and npm. The commands below work without a GitHub token, a model key, Docker, or an external runtime.

```bash
cd web
npm ci
npm run build
npm test
npm run dev
```

Open [Superbrain PM](http://127.0.0.1:5052/#pm), [department workspaces](http://127.0.0.1:5052/#departments), or [runtime setup](http://127.0.0.1:5052/#departments/runtime). The loopback preview saves department data to `web/.data/departments.json` and PM progress in the browser. Local responses use rules and templates.

## Continue development

| Start here | What it covers |
| --- | --- |
| [Rebuild guide](SUPERBRAIN_REBUILD_GUIDE.md) and [PDF](output/pdf/SUPERBRAIN_REBUILD_GUIDE.pdf) | Architecture, decisions, build order, deployment boundaries, and acceptance gates |
| [Product specification](BUSINESS_SUPERBRAIN_SPEC.md) and [PM guide](SUPERBRAIN_PM_GUIDE.md) | Nine creation stages, evidence checklists, 18 source categories, and client duties |
| [Department guide](DEPARTMENT_WORKSPACES_GUIDE.md) | Workboards, lead conversations, working notes, review, and handoffs across nine departments |
| [Runtime setup](SIM_LOBU_RESEARCH_AND_SETUP.md) and [starter files](integrations/) | Nineteen Sim workflow JSONs with matching briefs; nine Lobu role packs and pinned CLI config |
| [Pilot test plan](ETHIKCORP_TEST_PLAN.md), [client intake CSV](CLIENT_INTAKE_TEMPLATE.csv), and [templates](templates/) | Access and answer-quality testing, baseline measures, and editable intake forms |
| [Technical comparison](TECHNICAL_COMPARISON_APPENDIX.md) and [design philosophy](SUPERBRAIN_DESIGN_PHILOSOPHY.md) | Brain platform research, GBrain considerations, and UX decisions |
| [Developer handoff](CONTRIBUTING.md), [Cloudflare runbook](web/cloudflare/README.md), and [verification](verification/) | Code map, test commands, deployment, and evidence from the restored release |

Start with **one Sales proposal in private Sim and one Sales lead in private Lobu**. Test with synthetic inputs, record run receipts, and verify approval, source access, and model behavior before expanding. See the [working agreement](CONTRIBUTING.md) for the remaining integration work.

The [existing hosted preview](https://ethikcorp-superbrain.aqionlabs.workers.dev/pm) is global and uses browser-scoped workspaces. It has no live Sim, Lobu, GBrain or GitHub connector and no verified UAE residency or employee identity. Use an approved private environment for real company records. This repo has no client source files, live credentials, or workspace data.
