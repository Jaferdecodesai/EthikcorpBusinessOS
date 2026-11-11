# Ethikcorp BusinessOS

Built by Aqionlabs.ai. This repository is the Ethikcorp company portal: BusinessBrain PM, the CEO BusinessBrain, and the department Businessbots.

## Run

```bash
cd web
npm ci
npm run dev
```

Open http://127.0.0.1:5052/#pm. The customer portal preview is `PORTAL_MODE=customer npm run dev`. The Aqion team preview is `PORTAL_MODE=aqionteam npm run dev`.

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
