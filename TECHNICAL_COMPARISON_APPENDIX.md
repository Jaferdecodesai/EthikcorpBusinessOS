# Business brain technical comparison appendix

**Companion to:** [AqionCloud → Business Superbrain](BUSINESS_SUPERBRAIN_SPEC.md)  
**Review date:** 17 October 2026 · **Evidence level:** public product and repository documentation only; no installed head-to-head benchmark or supplier contract review.

## How to read this comparison

The fifteen names mix retrieval engines, agent runtimes, managed knowledge bases, collaborative workspaces and Markdown templates. They cannot fairly be ranked by a single “brain performance” number. Each entry below answers the same questions:

1. **Collect:** Which sources enter, and what must the client authorize or prepare?
2. **Structure and store:** What is the documented durable representation?
3. **Retrieve and model:** What embeddings, vectors, search, RAG or fine-tuning path is documented? “Not disclosed” means the cited public source did not establish it, not that the product lacks it.
4. **Maintain and act:** How are updates, corrections, user interaction and actions handled?
5. **Ethikcorp deployment work:** What extra work remains for permissioned departments, a PM dashboard and UAE-only processing?

“Easy setup” below refers to obtaining a small local or managed demo. A governed Ethikcorp rollout additionally needs owner-approved sources, identity, engagement ACLs, model routing, audit, backup and negative-access tests. No numerical answer-quality rank is asserted without a common Ethikcorp corpus and evaluation set.

## 1. GBrain — open-source knowledge kernel

- **Collect:** The documented company-brain import takes a local, committed Git Markdown checkout, previews the source and requires approval before recording the import. Other ingestion recipes and CLI/MCP inputs exist. Ethikcorp must identify authoritative pages, owners, versions and source boundaries; Aqion must build controlled exports for non-Markdown systems. [Company ingestion](https://github.com/garrytan/gbrain/blob/master/docs/guides/company-brain-ingestion.md), [brains and sources](https://github.com/garrytan/gbrain/blob/master/docs/architecture/brains-and-sources.md).
- **Structure and store:** A brain is one database containing sources, documents, chunks and graph links. PGLite suits a local trial; PostgreSQL plus pgvector is the documented team engine. Stable provenance and content hashes support incremental changes. [Engines](https://github.com/garrytan/gbrain/blob/master/docs/ENGINES.md), [infrastructure](https://github.com/garrytan/gbrain/blob/master/docs/architecture/infra-layer.md).
- **Retrieve and model:** Documented keyword, vector/HNSW, reciprocal-rank fusion, graph and optional reranking. Embedding providers are configurable; a keyless setup may use keyword search. The company import itself does not automatically embed or federate. No native company fine-tuning workflow was found. [Retrieval](https://github.com/garrytan/gbrain/blob/master/docs/architecture/RETRIEVAL.md), [embedding providers](https://github.com/garrytan/gbrain/blob/master/docs/integrations/embedding-providers.md).
- **Maintain and act:** Incremental sync, health/backfill and review mechanisms; agents consume it through CLI/MCP. It is not an employee portal, PM dashboard or complete department-lead runtime. Source-scoped reads are too coarse if one source mixes restricted client engagements. [Team tutorial](https://github.com/garrytan/gbrain/blob/master/docs/tutorials/company-brain.md).
- **Ethikcorp work:** Medium local team trial, high governed product integration. Trial one source per meaningful access boundary, UAE/local model endpoints, deletion, and source/version citation before selecting it. **Best documented retrieval design in this shortlist; not a proven answer-quality winner.**

## 2. Pensieve — managed context layer

- **Collect:** Selected connectors and uploads read scoped Notion, Drive, Slack and other tools. The client chooses source folders/channels/accounts and must approve what may be processed. Sync is read-only to source tools. [How connectors work](https://docs.pensieve.uk/connectors/how-they-work), [security](https://docs.pensieve.uk/security).
- **Structure and store:** It builds cited pages/claims and a context graph, with a dedicated graph database per context. The exact model/index implementation is vendor managed. Sources can be disconnected and context deletion requested, subject to retained backups/exports. [Security](https://docs.pensieve.uk/security).
- **Retrieve and model:** Provides context search/chat and MCP to other AI clients. Its managed inference sends relevant content through OpenRouter to serving model providers; the public security page does not establish UAE-only processing. No client fine-tuning workflow was verified. [Security](https://docs.pensieve.uk/security), [MCP](https://docs.pensieve.uk/mcp-server/overview).
- **Maintain and act:** Curation and source updates are product features; members may add/edit sources and pages. Context members share a sidebar. Content-permission buckets exist, but classification is probabilistic, may lag new content, and does not protect raw file bytes exposed through public links. [Roles](https://docs.pensieve.uk/members), [security](https://docs.pensieve.uk/security).
- **Ethikcorp work:** Fast SaaS demo, but strict UAE path unverified. Sensitive client/HR data would need separate contexts or tested controls, supplier architecture and contractual evidence. Useful benchmark for low-friction ingestion and citations, not the default for residency-constrained tenants.

## 3. Kanwas — collaborative agent workspace

- **Collect:** Users and agents create/edit collaborative canvases and documents; it is not presented as an automatic whole-company connector ingestion service. Ethikcorp would need to migrate selected knowledge or write connectors. [System overview](https://github.com/kanwas-ai/kanwas/blob/7c2292aec94ff0dcab3c72155d253a73ee794a89/docs/SYSTEM_OVERVIEW.md).
- **Structure and store:** Live collaborative state uses CRDT/Yjs with PostgreSQL/Redis in the published architecture. That is operational workspace state, not an evidenced company-wide citation corpus. [System overview](https://github.com/kanwas-ai/kanwas/blob/7c2292aec94ff0dcab3c72155d253a73ee794a89/docs/SYSTEM_OVERVIEW.md).
- **Retrieve and model:** Agent context and tool use are described; no documented native enterprise embedding/vector/RAG or fine-tuning pipeline was established from the cited overview. Do not infer one from the word “agent.”
- **Maintain and act:** Strong human/agent shared-workspace concept; agent execution uses external services in the documented stack. The client must define approval for state-changing actions.
- **Ethikcorp work:** High if used as the brain. Consider its collaboration UI pattern, while building governed ingestion, citations, engagement ACLs and UAE/local model routing separately.

## 4. Slite — managed company knowledge base

- **Collect:** Teams author/import documents and connect tools. Ethikcorp must identify canonical policies/SOPs, content owners and authorized integrations. [Knowledge base](https://slite.com/solutions/knowledge-base), [workflows](https://slite.com/workflows).
- **Structure and store:** Managed knowledge pages with citations and content health signals. The public pages assessed do not specify customer-controlled vector schema, chunking or index location.
- **Retrieve and model:** Agent/search features answer over company content; the public sources assessed do not document a client-controlled embedding, fine-tune or UAE deployment path. Validate every region and subprocessor with Slite before private data.
- **Maintain and act:** Editorial workflows and stale-content review are valuable patterns. It is a managed knowledge product, not the full supervisory lead-bot control plane.
- **Ethikcorp work:** Low SaaS setup and high UX value as a comparator; unsuitable as a confirmed strict-UAE deployment without written processing and storage evidence.

## 5. Sim — self-hostable workflow and knowledge platform

- **Collect:** Files, knowledge connectors and workflow integrations are documented. Ethikcorp supplies OAuth/service-account scopes, collection rules, authoritative sources, approval rules and test cases. [Knowledge](https://www.sim.ai/knowledge), [self-hosting](https://docs.sim.ai/platform/self-hosting).
- **Structure and store:** Self-host Compose or Kubernetes runs the application with PostgreSQL, Redis, scheduler and persistent file storage configuration. Loss of encryption keys or unmounted uploads is specifically called out in its operations docs. [Self-hosting](https://docs.sim.ai/platform/self-hosting).
- **Retrieve and model:** Knowledge bases create embeddings; default is an OpenAI model, while local Ollama is documented. Vector widths and model IDs are bound to new bases, and differently configured bases cannot be searched together. Agent blocks can use self-hosted compatible endpoints such as Ollama/vLLM. A knowledge reranker uses Cohere credentials in documented configuration, so a strict UAE/local pilot should test retrieval without it or implement an approved alternative. No native enterprise fine-tune pipeline was verified. [Environment variables](https://docs.sim.ai/platform/self-hosting/environment-variables).
- **Maintain and act:** Visual flows, agent blocks, human-in-the-loop block, schedules, webhooks, logs and API/MCP deployments make it close to the requested departmental workflow layer. Enterprise controls require explicit configuration. [Self-hosting](https://docs.sim.ai/platform/self-hosting), [workflows](https://www.sim.ai/workflows).
- **Ethikcorp work:** Medium to stand up a local workflow POC, high for restricted production. Verify KB-level ACLs, agent tool rights, connector data paths, disabled remote sandboxes/chat, key backup, object storage and egress. **Strongest quick workflow POC challenger to a custom runtime.**

## 6. Anytype for Business — collaborative source workspace

- **Collect:** Teams create or migrate wikis, projects, CRM-like objects and notes. The client must choose records to move; this is a workspace source option rather than a connector-first business brain. [Business](https://business.anytype.io/).
- **Structure and store:** Local-first object/workspace model with sync and encryption. The Business cloud service has a different key model from personal Anytype; do not transfer personal-app privacy claims to Business cloud. [Business FAQ](https://business.anytype.io/).
- **Retrieve and model:** Open API and MCP are advertised, but the cited page does not establish permissioned cross-tool RAG, a vector index or a fine-tuning pipeline for a company brain.
- **Maintain and act:** Human-owned pages and tasks can carry owners/freshness. A separate agent and PM control plane would still be needed.
- **Ethikcorp work:** The Business site explicitly says self-hosting is **coming soon and unavailable at launch**. Therefore its Business edition is not an available UAE self-host choice in this assessment; revisit only after an actual release and architecture review. [Business pricing/FAQ](https://business.anytype.io/).

## 7. Evernote Enterprise — managed note workspace

- **Collect:** Employees place notes, files and captured material in enterprise workspaces. Client must migrate and own note quality/visibility. [Enterprise](https://evernote.com/enterprise).
- **Structure and store:** Managed notes and search; its public enterprise page does not expose a client-controlled chunk/vector/graph pipeline.
- **Retrieve and model:** No verified native permissioned RAG architecture or enterprise fine-tuning path for this use case in the cited material. Search usefulness cannot be equated with answer quality.
- **Maintain and act:** Normal human note upkeep; a custom bot runtime and onboarding PM would be needed.
- **Ethikcorp work:** Easy note-app adoption, high mismatch to the requested product and no established UAE-only model/data path.

## 8. Khoj — self-hostable AI search/agents

- **Collect:** Documents, web/Notion-style inputs and user content through its documented connectors. Ethikcorp must approve source scopes and fit them to department/engagement identities. [Repository](https://github.com/khoj-ai/khoj).
- **Structure and store:** An indexed corpus supporting personal/organizational search. The exact production deployment should be inspected at a pinned release for database, parser and access-control behavior.
- **Retrieve and model:** Semantic search and RAG-style chat with local model options are documented. No built-in company fine-tuning pipeline was established from the cited repository.
- **Maintain and act:** Chat, custom agents and scheduled automations. Enterprise approval queues and onboarding gates remain separate.
- **Ethikcorp work:** Plausible self-host RAG challenger. Test source-level access, synchronized deletion, UAE/local inference and corpus provenance before comparing on the same golden questions as GBrain.

## 9. Obsidian Second Brain — Markdown vault/agent skills

- **Collect:** User-controlled Obsidian/Markdown vault and capture routines; Ethikcorp would have to author and curate the vault. [Repository](https://github.com/eugeniughelbur/obsidian-second-brain).
- **Structure and store:** Files in a vault with a semantic index; incremental reindexing is documented.
- **Retrieve and model:** Optional local Ollama embedding model such as `bge-m3` or an OpenAI-compatible endpoint for semantic search. This does not by itself supply an enterprise permissioned RAG service or fine-tuning workflow. [Repository](https://github.com/eugeniughelbur/obsidian-second-brain).
- **Maintain and act:** Personal/coding-agent note routines and manual curation; not a managed departmental supervisor.
- **Ethikcorp work:** Local single-user setup can be modest. Multi-user identity, record-level access, connectors, audit and PM dashboard would be a separate build.

## 10. Supermemory Company Brain — Cloudflare/Supermemory application

- **Collect:** Slack and connected company sources. Client must authorize channels and any action scopes; broad chat capture is not a safe default. [Repository](https://github.com/supermemoryai/company-brain).
- **Structure and store:** Published stack uses Cloudflare Workers, D1 and Durable Objects plus the supermemory service/API. Those dependencies define a processing path that must be assessed, not assumed UAE resident.
- **Retrieve and model:** Supermemory provides the memory/retrieval service; the public README does not establish customer-controlled UAE embedding/vector placement or a native company fine-tune flow. Model API use adds another residency boundary.
- **Maintain and act:** Proactive company assistant and Slack/action patterns are product references.
- **Ethikcorp work:** Strong functional inspiration, but the published stack does not demonstrate an end-to-end strict UAE-only deployment. Reimplementing its ideas in UAE infrastructure would be a new engineering project, not a small configuration change.

## 11. Agno Scout — live-source agent

- **Collect:** Live context providers including web/workspace tools; client supplies narrowly scoped credentials and a durable authorized place for agent-written notes. [Repository](https://github.com/agno-agi/scout).
- **Structure and store:** Search/navigation plus a self-maintained wiki/CRM style memory in the published concept. Inspect configured stores and provider boundaries for a pinned build.
- **Retrieve and model:** The approach emphasizes navigating live sources instead of a bulk vector-first ingestion flow; no native company fine-tuning pipeline was established from the cited repository.
- **Maintain and act:** Agent can maintain working context and interface with tools; human action authority must be added or verified per tool.
- **Ethikcorp work:** Good live-source comparator where CRM/tasks change quickly. Prove ACLs and citation stability across updates; build the PM dashboard and supervisory hierarchy separately.

## 12. Lobu — integrated agent control plane

- **Collect:** Connector workers consume scheduled or webhook events from company tools; Ethikcorp must authorize each connector scope, event retention and entity mapping. [Architecture](https://lobu.ai/getting-started/architecture/).
- **Structure and store:** Append-only events feed typed entities, relations and projections. Single-host Docker documents Postgres+pgvector as the only required external service, with persistent agent workspaces. [Architecture](https://lobu.ai/getting-started/architecture/), [Docker](https://lobu.ai/deployment/docker/).
- **Retrieve and model:** Persistent memory/graph and embeddings are built into its agent concept; exact embedding/model provider and per-source authorization require a pinned deployment review. No native company fine-tune pipeline was verified from the cited docs.
- **Maintain and act:** Persistent specialists, automations, tool policy and admin UI/API are closer to department lead bots than GBrain alone. Corrections should remain traceable to events and human owners.
- **Ethikcorp work:** Medium local Docker POC, high governed rollout. Its sample Docker command uses an external Anthropic key; use an approved UAE/local model route and prove it works. Verify source ACLs, tenant separation, deletion and approval behavior before selecting it as the full platform. **Closest whole-product challenger.**

## 13. Sylph — Git-based agent context

- **Collect:** Teams write domain folders and agent instructions in Git. Ethikcorp must curate context, versions, audience and repo access. [Repository](https://github.com/getnao/sylph).
- **Structure and store:** Markdown files/skills under version control; no managed company data index or database is established in the cited repository.
- **Retrieve and model:** Agent clients read context through Git/MCP patterns. No documented enterprise vector/RAG or fine-tuning system was established.
- **Maintain and act:** Approved agent outputs can improve context; approval and Git review are the practical governance path.
- **Ethikcorp work:** Quick for a technical team to codify bot roles, high work for nontechnical onboarding, connectors, ACLs and UAE deployment. Useful lead-bot instruction pattern.

## 14. Ankole — identity-aware agent/memory system

- **Collect:** Chat, files and URLs enter durable memory. Client must decide which channels may be captured and who owns corrections/retention. [Repository](https://github.com/AgentBull/ankole).
- **Structure and store:** Claims carry source/time/audience metadata; documented agent harness and workers provide ongoing state. Inspect a pinned release for exact index layout, failure recovery and deletion semantics.
- **Retrieve and model:** Claim-based memory and search are documented; no built-in company fine-tune pipeline was verified. Compare cited answer quality with GBrain on the same approved corpus, not with vendor demos.
- **Maintain and act:** Identity, corrections and skill proposal are relevant to departmental supervisors. Its self-host stack and Docker privileges demand a security review.
- **Ethikcorp work:** High deployment and audit effort. Keep as an agent-harness/security spike if Lobu or Sim fail requirements; verify model egress and worker isolation.

## 15. Infinite Brain OS — validated portable canon

- **Collect:** Git Markdown/YAML intake under named namespaces; the client authors and approves canonical facts. [Repository](https://github.com/starmynd-org/infinite-brain-os).
- **Structure and store:** Versioned files, entities and validation/promotion steps; not an evidenced hosted database or cross-tool sync service.
- **Retrieve and model:** File-reading agents can use the canon. No native enterprise embeddings/vector/RAG or fine-tuning pipeline was established from the cited repository.
- **Maintain and act:** Human review before promotion is a valuable source-of-truth pattern; bot runtime/action approvals are separate.
- **Ethikcorp work:** Useful format for a verified policy/decision layer beside a retrieval engine. High effort as the sole business platform because connectors, identity, search, PM dashboard and residency operations must be added.

## Decision tests and client contributions

| Candidate | Why test it | Minimum client contribution for a fair spike | Failure that rules it out |
| --- | --- | --- | --- |
| GBrain | Transparent hybrid retrieval, citations and portability | Approved Markdown export of 30–100 mixed English/Arabic documents from three pilot departments; owner/version/access labels; 50+ reviewer questions including denials | Source-granular ACL or import workflow cannot enforce engagement boundaries at acceptable effort; fails citation/recall threshold |
| Plain PostgreSQL/pgvector baseline | Measures whether GBrain complexity adds value | Same corpus, embeddings, questions and ACL rules | Baseline itself fails agreed quality/security gate; then improve corpus and extraction before choosing a framework |
| Sim | Fast workflow builder and documented self-host path | Two read-only integrations, one approved knowledge collection, one lead-bot draft flow, named reviewer | Cannot keep all active model/embedding/OCR/sandbox calls inside approved boundary or cannot enforce KB/tool ACLs |
| Lobu | Persistent specialists and event-based company memory | One event source, one department specialist, approval policy, identity test users | Event/claim model cannot prove client/engagement isolation, correction and deletion, or approved model routing |
| Ankole | Identity-aware agent memory | Same question/denial set plus a minimal controlled chat corpus | Worker privilege/security burden or authorization behavior is unacceptable |

The numbers above are proposed **evaluation sample sizes**, not vendor benchmarks or claims of sufficient statistical power. The client chooses the actual corpus, reviewers, access rules and pass thresholds before private data is loaded.

## Decision rule

Start the Ethikcorp pilot with the custom onboarding PM and tenant control plane, then run a bounded GBrain-versus-baseline retrieval test. In parallel, perform a small Sim workflow POC and Lobu specialist POC on the same synthetic or approved data. Select one retrieval path and one agent/workflow path only after access, residency, quality and operator-effort evidence exists. A single platform may win both roles; overlapping brain systems should not be deployed merely because they are open source. Fine-tuning remains optional and follows a demonstrated RAG/prompt failure, a licensed training set and a measured improvement.
