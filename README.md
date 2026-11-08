# AqionLLM

AqionCloud Business Superbrain, with Ethikcorp as the first pilot. The active architecture is **Superbrain PM and department workspaces + Sim workflows + Lobu department leads**. This repository contains the restored pre-Google portal, editable docs, runtime starter files, and blank client intake templates.

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
