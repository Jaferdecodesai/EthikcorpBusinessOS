# Sim, Lobu and the Ethikcorp department workspaces

Reviewed: 18 October 2026. Evidence: current official documentation and inspected public source. No comparative speed or agent-quality benchmark was run. The nine department names and nineteen workflow subjects follow the supplied Ethikcorp prototype reference; company owners, operational records and outcome measures remain client inputs.

## Decision

Use **Sim as the workflow authoring and execution candidate**, and **Lobu as the persistent specialist candidate**. Retain the custom Superbrain portal for the department workboards, human review, handoffs and operating status. Keep GBrain as the separately evaluated curated-document retrieval candidate. These are distinct responsibilities; installing three products does not establish one governed company brain.

My inference is that Sim should reduce the work needed to assemble and inspect bounded flows because its canvas, blocks, deployment and run APIs already exist. Lobu is a better fit for a responsibility that continues across conversations because it provides specialists and shared organizational context. This is a capability assessment, not measured setup-time superiority. Test a single Sales proposal flow and one Sales lead before expanding.

## What the research establishes

| Area | Sim | Lobu |
| --- | --- | --- |
| Best initial role | Repeatable input -> preparation -> review workflow | Persistent department role and conversation/context |
| Setup | Documented Docker/Kubernetes paths; PostgreSQL, auth/secrets, realtime and optional external services require configuration | Local embedded runtime or a self-hosted app with persistent workspaces and external PostgreSQL/pgvector for production |
| Authoring | Visual blocks; import/export documents; deployed APIs | `lobu.config.ts` plus explicit agent directories and role files |
| Persistence | Workflow versions, runs, outputs and platform records | Agent history and durable organizational event/entity context |
| Human authority | Workflow review blocks and the portal's review queue | Runtime policy and guardrails; prompts alone cannot grant authority |
| Main integration burden | Provider/connector/sandbox routing; map deployed IDs; reconcile runs | Provider selection, identity, org/source policy and specialist session handling |
| UAE path | Self-host all active components and verify each external dependency | Self-host runtime, database, workspaces, inference and embeddings; verify enabled network paths |

Sim's [self-hosting guide](https://docs.sim.ai/platform/self-hosting) distinguishes the app from external model, chat, OAuth and sandbox dependencies. Plain JavaScript without imports can execute locally; other execution modes may require a remote sandbox. Enterprise configuration also needs feature-specific setup. For a UAE boundary, inventory every enabled dependency and do not infer residency from the app hostname alone.

Sim's [Function block documentation](https://docs.sim.ai/workflows/blocks/function) supports small deterministic transformation steps. The supplied nineteen starters use this mode and require no inference provider. The [import API](https://docs.sim.ai/api-reference/workflows/importWorkflow) accepts workflow documents, but imported flows still need inspection, a synthetic run and private deployment before mapping them to this portal.

The [Lobu agent workspace guide](https://lobu.ai/guides/agent-prompts/) separates identity, standing instructions and user context into role files. Runtime workspaces and shared memory have different purposes. The supplied role files specify responsibilities and review rules; they do not authorize company sources. The [provider guide](https://lobu.ai/reference/providers/) distinguishes model inference from execution environment, so both need region and policy review.

The [Lobu Docker guide](https://lobu.ai/deployment/docker/) calls for durable workspace storage and database/secrets configuration. It also recommends pinning images. No cloud region, managed service contract or UAE-only guarantee was established from these pages.

## Version-sensitive findings

- Inspected Lobu commit: `8b4e19efc65ba5f1f0a6dcc1be6acf21a147cdb8`. Its [agent definition](https://github.com/lobu-ai/lobu/blob/8b4e19efc65ba5f1f0a6dcc1be6acf21a147cdb8/packages/cli/src/config/define.ts) rejects the removed `agent.tools` field and directs action permissions to Settings -> Policies. Some public examples still contain that field. The supplied config omits it. Recheck policies against the installed release.
- Inspected Sim commit: `c6cef5f87b6a1d1d01df89e7140bad9e9fd4c2e2`. The starter shape follows its [import parser tests](https://github.com/simstudioai/sim/blob/c6cef5f87b6a1d1d01df89e7140bad9e9fd4c2e2/apps/sim/lib/workflows/operations/import-export.test.ts), `start_trigger`, and Function configuration. These generated files have not been imported into a live Sim instance.
- The npm registry reported `@lobu/cli` version `22.0.0`, with Node `>=22 <25 || >=26`. The portal itself currently runs on Node 20; use a supported Node version for the separate Lobu project.

Local verification: the supplied `lobu.config.ts` passed `lobu validate` using the pinned CLI and Node 22, reporting nine agents. This checks the declared project shape; provider credentials, deployed policies and source access remain unverified. The nineteen generated Sim Function bodies also have executable contract checks using synthetic inputs. No Sim import success is claimed from these checks.

## Implemented portal contract

There are nine separate department dashboards: Sales & BD, Marketing, Consulting Delivery, Technology & AI, Finance, HR & Talent, Operations, Client Success, and Legal & Compliance. Each has its own mandate, workflow catalogue, partner map, workboard, lead conversation, memory, review queue, source view and event history.

All operational counters derive from the portal's current local records. The default workspaces are empty. Starter tasks are added only when selected. Proposed business measures show “Baseline not supplied”; the app does not manufacture productivity, revenue, employees or source connections.

The server persists local records in `web/.data/departments.json`, with atomic file replacement. Memory corrections retain earlier provenance; retirement removes notes from active memory. This is a single-process local store, not a multi-user database or enterprise authorization system. The existing Brain creation PM and its checklist remain accessible separately.

### Sim adapter

The server calls `POST /api/v2/workflows/{workflowId}/execute` with `X-API-Key`, a stable `X-Run-Id` and `async: true`. It stores the receipt, then reconciles through `GET /api/v2/workflows/{workflowId}/runs/{runId}?includeOutput=true`. Only completed output enters review. No automatic retry is performed after an uncertain response. A reviewer accepts or rejects a specific output hash. Approval creates an approved local draft; it does not send, publish or post to a business system. See [execute](https://docs.sim.ai/api-reference/workflows/executeWorkflowV2) and [run status](https://docs.sim.ai/api-reference/workflow-runs/getWorkflowRunV2).

### Lobu adapter

The server creates or resumes a session through `/lobu/api/v1/agents`, subscribes to events before sending a message, and correlates the reply with its message ID. Each department uses a stable thread. Final output, failure, pending state or a request for human attention is recorded. Tokens remain on the server. The adapter does not approve tool requests; they require attention in Lobu. See [agent API](https://lobu.ai/reference/api-reference/) and the inspected [CLI chat implementation](https://github.com/lobu-ai/lobu/blob/8b4e19efc65ba5f1f0a6dcc1be6acf21a147cdb8/packages/cli/src/commands/chat.ts).

Local mode creates structured documents and priority plans from supplied inputs and current records. It performs no model inference, source retrieval or external operation. The UI identifies the selected execution route.

## Setup sequence

1. Run the portal with `cd web`, `npm install`, `npm run dev`, then open `http://127.0.0.1:5052/#departments`. The server binds to loopback.
2. Open `integrations/lobu` using a supported Node version, install its pinned CLI dependency and run `npm run validate`. Choose a concrete provider/model, preserve runtime database/encryption/workspace storage, and review org membership, source scope, action policies and guardrails. Validate and review the desired state before applying it to the intended private runtime.
3. Import one file from `integrations/sim/workflows` into the private Sim deployment. The starter is Start -> Function and returns a structured template. Use its matching brief to add approved retrieval/model steps only when required. Inspect, run synthetic data, deploy privately and record the deployed workflow ID.
4. Set the portal's server environment using `web/.env.example`. `SIM_WORKFLOW_MAP` maps the internal workflow ID to the deployed Sim ID. `LOBU_AGENT_MAP` can override the default `ethikcorp-<department>` agent IDs. Configure `SIM_BASE_URL`, `SIM_API_KEY`, `LOBU_BASE_URL`, `LOBU_API_TOKEN` and `LOBU_ORG`. Enable `RUNTIME_EGRESS_APPROVED=true` only for the agreed data route. Restart the server.
5. Use the Runtime setup page to confirm configuration. Configuration is not a successful connection test. Run a synthetic workflow and specialist conversation and retain their receipts. Test persistence after restart, restricted source denials, current citations, corrections, source withdrawal, rejected actions and restore behavior.
6. Load real company records only after the company owner confirms sources, users, engagements, models, storage, processing and review authority. Apply authenticated identity and server-side access policy before any employee pilot or non-loopback deployment.

## Client inputs

For each department, Ethikcorp provides its actual lead and reviewers; source-system owners and current source versions; engagement and department access boundaries; an approved workflow brief and known exceptions; approved model/embedding/connector routes; and sample questions/results for acceptance. Finance supplies commercial/tax inputs; HR supplies role-level policy inputs; Legal supplies approved templates and qualified review. These are requests, not statements of existing client systems.

## What remains externally unverified

No Sim or Lobu server, provider key or client-approved source connection was supplied. The portal adapters are implemented, and protocol behavior can be verified with contract tests; this does not establish live execution or UAE residency. Native Sim import/deployment, Lobu provider/tool-policy application, authenticated employee roles, live GBrain retrieval and business-system writes require their own configured environment and acceptance evidence.
