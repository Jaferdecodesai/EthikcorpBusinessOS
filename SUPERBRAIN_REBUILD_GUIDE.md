# Ethikcorp Superbrain: rebuild and handover

**8 November 2026 | Active baseline: Superbrain Portal + Sim + Lobu**

## 1. Decision

Use Sim for bounded workflows, Lobu for persistent department leads, and the Superbrain portal for source intake, permissions, workboards, draft review and handoffs. Evaluate GBrain as the separate curated knowledge layer. Start with a single Sales proposal and Sales lead before adding more workflows, teams or services.

| Decision factor | Sim + Lobu | Google ADK |
| --- | --- | --- |
| Workflow authoring | Sim's visual canvas, imports, versioned deployment and run views suit operations staff | Python graphs, review through code and developer tooling; good for complex logic and engineering teams |
| Long-lived leads | Lobu supplies specialist workspaces, organizational context and controls | ADK supplies session and memory interfaces; the product needs to assemble and operate them |
| Deployment and operations | Two runtimes plus storage, secrets, upgrades and failure recovery; more moving parts | One custom agent runtime can be simpler to operate; Google-managed deployment brings Google IAM, service and model configuration |
| UAE-only route | Practical candidate when all components and their dependencies run in the approved boundary | ADK itself can run in a private container with a local model. The specific Cloud Run + Gemini route explored for this project has no verified UAE-only path |
| Evidence in this pilot | Existing adapters, 19 deterministic starters, 9 role packs, local tests and a verified hosted preview | Archived scaffold and integration work; no proven live Gemini model quality |
| Quality and speed | Measure with the same model, sources and tasks | No comparative answer-quality, latency, cost or setup-time benchmark was run |

The recommendation is specific to Ethikcorp's product and current implementation. It does not claim that Sim or Lobu generates better answers than ADK. The chosen model, approved source quality, retrieval and evaluation drive answer quality. If this becomes a developer-led product with complex code-owned orchestration or a strong requirement for Gemini Enterprise, reassess ADK.

Primary references checked on 8 November 2026: [Sim self-hosting](https://docs.sim.ai/platform/self-hosting), [Sim workflow API](https://docs.sim.ai/workflows/deployment/api), [Sim logs and telemetry](https://docs.sim.ai/platform/self-hosting/observability), [Lobu Docker](https://lobu.ai/deployment/docker/), [Lobu inference and execution](https://lobu.ai/reference/providers/), [Lobu session API](https://lobu.ai/reference/api-reference/), [ADK container deployment](https://adk.dev/deploy/), [ADK model connectors](https://adk.dev/agents/models/), [Cloud Run regions](https://docs.cloud.google.com/run/docs/locations), [Gemini Agent Platform residency](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/data-residency).

## 2. What was restored

- Hosted: the exact Cloudflare Worker version `853816c1-30c0-4f16-92b0-c3fe2db0857f`, the release from 25 October 2026. Both PM and department routes share that Worker. Cloudflare rollback changes the version serving traffic; the existing Durable Object is not reset.
- Local: pre-Google portal source was reconstructed from its original edit history. All 18 public asset hashes from the original release match. The restored active web package does not need Google ADK or Google OAuth to start.
- The existing local data directory, cloud browser workspace binding and PM browser keys were preserved. The later Google web files were backed up separately; the Google Python project and documents remain available for reference. No data purge or implicit migration was performed.
- Both modes keep existing workspace conversations, draft and review history, approved deliverables and curated notes under the agreed workspace policy. A saved draft needs human approval before use.
- The public Cloudflare deployment is a browser-scoped, globally hosted preview. It has no live Sim/Lobu, source connector, employee identity or UAE residency configuration. Use synthetic content there.

## 3. Start here after unpacking

This checkout is self-contained for the existing local preview. It includes source, lockfiles, runtime starters, test scripts, guides and blank client templates. Use Node.js 22 for the portal and the pinned Lobu CLI. Docker and Compose are needed only when bringing up private runtime services. Install current reviewed release images in your environment; do not treat starter files from October as upstream compatibility proof.

From the repository root:

```bash
cd web
npm ci
npm run build
npm test
npm run dev
```

Open [local Superbrain PM](http://127.0.0.1:5052/#pm) and [local department workspaces](http://127.0.0.1:5052/#departments). The loopback server creates its workspace store under `web/.data` as records are saved. Copy `web/.env.example` to `web/.env.local` for local setup. Leave `RUNTIME_EGRESS_APPROVED=false` until the operator approves the runtime destination and permitted data. Do not commit `.env.local` or workspace data.

Use `web/cloudflare/README.md` for the synthetic hosted preview. It needs a server-managed session secret. Real company data needs a separate authenticated deployment and an approved data route.

## 4. Design and build order

| Step | Build | Acceptance evidence |
| --- | --- | --- |
| 1 | One organization shell, PM and nine departments, backed by the shared department catalogue | All nine departments and nineteen workflow definitions appear; navigation does not grant data access |
| 2 | Nine PM stages with evidence checklist, owners, source inventory, examples, intake, export and destinations | All 18 categories visible; evidence tracked independently from completion; approved private repository test before upload |
| 3 | Department workboards, notes, messages, versioned drafts, review and handoffs | Restart retains history; stale draft hash denied; duplicate handoff does not create another task |
| 4 | Single private Sim Sales proposal workflow | Import one starter; see its canvas; execute synthetic input; capture deployed workflow ID and run receipt; reconcile an interrupted run without repeating execution |
| 5 | Single private Lobu Sales specialist | Validate role pack; confirm configured model and allowed tools; send a synthetic request; correlate final response; restart and verify permitted context |
| 6 | Governed knowledge service and scoped citations | Upload approved versions, chunk and index; run positive and negative access tests; withdraw a source and prove subsequent results exclude it |
| 7 | Signed-in pilot and verified deployment boundary | Server-verified employee identity, organization/engagement scoping, actual permissions and reviewed residency map |
| 8 | Expand to nine leads and nineteen workflows | Signed acceptance per department; compare time, accuracy and rework with a baseline before publishing productivity claims |

## 5. Data collection and knowledge

Use the PM guide, client intake CSV and blank inventory template together. Each category needs a named client owner, authoritative system, original locator, approved use, classification, current version, permitted department/engagement, approval reference and retention or deletion rule. Ask the owner for a narrowly scoped export and examples. Upload only the approved public/internal subset to a verified private repository when that route is approved. Keep restricted material in its controlled source system. For UAE-only data, use a verified UAE private Git or document store instead of assuming GitHub Cloud is sovereign.

1. **Discovery:** name the sponsor and owners; map authoritative sources and exclusions.
2. **Collection:** record owner, location, classification, version, authority and receipt. Obtain file exports only within approved scope.
3. **Cleaning:** convert reviewed versions to clean Markdown or structured records. Dedupe; preserve superseded versions and approved provenance.
4. **PII handling:** apply client-approved minimisation, redaction, retention, backups and deletion rules.
5. **Chunking:** attach source ID, exact version, section, hash, dates and access scope to every chunk.
6. **Embeddings:** test with a small curated set. Use PGLite for the local GBrain experiment; use approved UAE PostgreSQL/pgvector for a shared restricted pilot if validated. Keep the embedding model version and index build receipt.
7. **Access:** enforce organization, engagement, department and role before retrieval, reranking and model input. Deny records missing access metadata.
8. **Evaluation:** use owner-provided questions, expected facts, expected citations and expected denials or abstentions.
9. **Refresh:** track version changes, withdrawn sources and index rebuild/deletion evidence; assign the owner and review schedule.

The Git repository is the source version and audit layer; the runtime index is separate. Add retrieval only after storage, embeddings and model routing are verified. Start with RAG for traceability and updates. Consider fine-tuning only for a demonstrated stable style or behavior problem, with an approved training dataset and evaluation; it does not replace source permissions or versioned retrieval.

## 6. Bring up Sim and Lobu

### Sim: workflow service

1. Read the current Sim self-hosting guide. Choose a pinned deployment, provision PostgreSQL, Redis and runtime services, and configure authentication, secrets, backups and network boundaries. In a restricted installation, inventory optional Copilot, OAuth, sandboxes, execution logs and telemetry before enabling them.
2. From `integrations/sim/workflows/`, import `sales-proposal.json`. Its matching brief lists the inputs and expected result. The supplied Start -> Function workflow is deterministic; it does not call a model.
3. Check the canvas and execute synthetic input. Deploy privately and record its deployed workflow ID. Configure `SIM_BASE_URL`, `SIM_API_KEY` and `SIM_WORKFLOW_MAP` in the portal server. Use a least-privilege workspace credential. Confirm compatibility of v2 execute and status APIs with the installed release.
4. From the Sales workspace choose Sim workflow, prepare the draft and refresh its receipt. Capture one run identifier; poll it rather than starting the same uncertain run again. Verify completed output lands in review and cannot be sent automatically.
5. Add approved retrieval or model blocks only where useful. Compare outcomes on the same test set before extending the remaining 18 workflows.

### Lobu: department lead service

1. Read the Lobu Docker guide, set up the pinned runtime with PostgreSQL/pgvector and persistent workspaces, then configure the intended organization, inference, sandbox, allowed domains and policies. Keep production credentials in the server secret store.
2. In `integrations/lobu`, run `npm ci` and `npm run validate` with Node 22. Review the nine specialist role files and the desired-state plan. Apply only to the intended private environment after reviewing the changes.
3. Configure `LOBU_BASE_URL`, `LOBU_API_TOKEN`, `LOBU_ORG` and, if needed, `LOBU_AGENT_MAP`. Confirm session and event APIs on the pinned release. The adapter opens the event stream before sending and correlates replies by message ID.
4. The restored local adapter uses a stable department thread for the single-operator pilot. Before a shared rollout, isolate threads and memory by verified tenant, engagement and user/workgroup as policy requires. Test revoked access and tool-approval escalation. Leave background jobs and outbound action tools disabled until reviewed.

## 7. UAE deployment and pilot tests

For a UAE-only tenant, approve the location of the portal, identity and network path, files, OCR, embeddings, search, reranking, inference, execution sandboxes, memory, logs, telemetry, backups, recovery and support access. A UAE VM, private repository or API key alone is not enough. Prefer a UAE-hosted open-weight model or a UAE processing endpoint whose service terms and actual route meet the client's scope. Pin the model and verify no unauthorized fallback. Keep every outgoing destination closed until it is needed and approved. Disable optional exports or telemetry that would cross the boundary. Treat retention policy as separate from processing location.

| Test family | Pass condition for first pilot |
| --- | --- |
| Access | Allowed user sees only approved current sources; forbidden tenant, department, engagement, revoked user and withdrawn source yield no restricted content |
| Answer quality | Evidence-supported answers cite exact accessible versions; stale conflicts are flagged or resolved; the lead abstains on missing evidence; Arabic and English examples checked |
| Business authority | A person reviews the exact saved draft version; attempts to approve a stale version or execute a prohibited action fail |
| Reliability | Repeat requests do not duplicate actions; unknown remote outcomes can be reconciled; notes and drafts survive restart; backup restore is tested |
| Efficiency | Compare setup effort, median and tail latency, cost per accepted result, human review time and rework using the same model, sources and representative questions |

Use the pilot test plan for proposed thresholds and test design. Ethikcorp supplies the named acceptance owners, real permitted sources, denied cases and final release criteria. The restored software and synthetic checks establish the preview's behavior; native Sim import, live Lobu execution, quality, UAE-only processing, and authenticated collaboration still require evidence in the actual environment.

## 8. Document and source index

| File or folder | Use |
| --- | --- |
| `BUSINESS_SUPERBRAIN_SPEC.md` | Product, knowledge architecture, data sources, UAE tracks and client duties |
| `SUPERBRAIN_PM_GUIDE.md` | Nine stages, source intake, checklists and GitHub flow |
| `DEPARTMENT_WORKSPACES_GUIDE.md` | Nine leads, workboards, review queue, notes and handoffs |
| `SIM_LOBU_RESEARCH_AND_SETUP.md` | Runtime implementation, source review, provider setup and protocol references |
| `TECHNICAL_COMPARISON_APPENDIX.md` | Brain platform research and GBrain setup considerations |
| `SUPERBRAIN_DESIGN_PHILOSOPHY.md` | Product and interaction decisions |
| `ETHIKCORP_TEST_PLAN.md` | Access, evidence quality, baseline and acceptance tests |
| `CLIENT_INTAKE_TEMPLATE.csv` and `templates/` | Editable client intake and blank inventory template |
| `integrations/sim/` and `integrations/lobu/` | 19 workflow JSONs and briefs; nine specialist role packs with evaluation instructions |
| `web/` | Recovered app, runtime adapter source, configuration examples, tests and Worker |
| `output/pdf/` | PDF equivalents for the core handover and earlier reference guides |
| `verification/` | Rollback/build verification and historical hosted release asset manifest |

The two supplied source PDFs, Ethikcorp-Brain-Setup and Company-Brain, are separate reference attachments. Treat them as background and illustrative prototype inputs. This repository contains blank client templates and implementation sources, with no client records, secret files, workspace stores, credentials or Google experiment files.
