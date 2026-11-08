# SuperbrainOS design phase

**8 November 2026.** Audit, baseline, and three reference-locked visual directions. No application code was changed. Nothing was deployed. The next pass should lock one direction before implementation.

## Brief

Designing the Aqion SuperbrainOS and Aqion Businessbots operating shell for UAE SME and enterprise operators, on the web.

Goal: separate knowledge administration, a CEO decision desk, and department execution, while showing provenance, permissions, ingestion state, retrieval evaluation, and supervised automation.

Tone: precise, dense, calm enough for decisions. Premium comes from hierarchy and evidence, not decoration.

Risk: the portal can look more capable than it is. Demo, disconnected, and specimen states must stay visible.

Must remember: the company brain is built from approved records. Department superbots prepare work and surface bottlenecks. People keep authority.

Constraints: preserve the working PM, department, and runtime flows. Inter for dense UI. Fraunces or Bricolage only if a reference gives them a real display role; this phase uses neither. Observed Aqion site colors (bone `#faf7f2`, paper `#fff`, ink `#1c1917`, indigo `#4f46e5`) are not an official system. Indigo is not used. No card grid, no decorative gradient, no invented integrations, metrics, offline mode, or UAE residency.

Path: visual exploration and audit. Implementation waits for a locked direction.

## Research

Live Refero was not used. The Refero MCP server required authentication and returned no tools. Directions below use the Refero method with sources that were actually fetched on 8 November 2026, plus the product documents in this repository. Hex values that a vendor did not publish are labeled as adaptations.

Styles and product references reviewed:

- [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh) (12 March 2026). Dimmer navigation, compact tabs, fewer icons, fewer and softer separators, warmer neutral than the previous cool blue, main content ahead of chrome. Also the public [linear.app](https://linear.app/) issue list: one row holds status, id, title, and metadata; status color stays on the state mark.
- [Attio record pages](https://attio.com/help/reference/attio-101/attios-data-model/understanding-records). A record is a row. The record page keeps attributes in a side column: owner, relationships, activity. Attribute history has an actor and an active interval.
- [Stripe Apps tables and patterns](https://docs.stripe.com/stripe-apps/components/datatable). Typed cells, a status map of `neutral | urgent | warning | negative | positive | info`, and first-class empty, error, and pending states. [Design patterns](https://docs.stripe.com/stripe-apps/patterns) treat status, empty, and loading as patterns. Stripe blurple is not imported.
- [Ironclad workflow page](https://support.ironcladapp.com/hc/en-us/articles/30794550432151-Ironclad-s-New-Dashboard-and-Workflow-Page-Overview-April-2025-Release) and [record status](https://support.ironcladapp.com/hc/en-us/articles/17438784927127-Contract-and-Record-Status-Overview). A banner says whose turn it is and what happens next. Status pills can carry a sub-status. An activity feed records the path.
- [Vercel dashboard redesign](https://vercel.com/blog/dashboard-redesign) and [Geist](https://vercel.com/geist/introduction). The deployment is the object: status, logs beside the run, queued / building / error / ready. Geist Sans and Geist Mono are the reference faces. This environment has Inter and JetBrains Mono, so the mockup substitutes those and says so.
- [Glean citations](https://docs.glean.com/user-guide/assistant/glean-chat/glean-chat-citations/glean-citations). A citation follows the claim, hover can show the passage, and opening a source never grants new access. “No sources” produces no citations.

No flows were retrieved from Refero. Journey logic is taken from the rebuild guide and the current server states.

## What is implemented

Verified in this checkout. These are boundaries, not a roadmap claim.

| Area | In the repo now | Not in the repo |
| --- | --- | --- |
| PM | Nine creation stages, one checklist, 18 source categories, browser-saved plan, private-repo upload path for `profile`, `policies`, `sops`, `tasks`, `marketing` | Employee sign-in, multi-user audit, GBrain import, embeddings, retrieval |
| Departments | Nine workspaces, 19 workflow templates, workboard, local lead, memory with provenance, hash-bound review, partner handoff, activity events | Live Sim, live Lobu, external send, CRM or finance writes |
| Runtime | Adapters and a status page. Local mode is rules and templates. Egress stays off unless an operator sets `RUNTIME_EGRESS_APPROVED` | A connected engine, a model route, UAE processing |
| Hosting | Cloudflare Worker build. Browser-scoped Durable Object. PM plan in `localStorage` | Shared employee workspace, residency evidence |
| Automation | On-demand only. No scheduler in `web/`. A paused lead rejects a new message or run | The older autonomous Ethikcorp routines. Nothing in this tree starts them |

Local lead mode does not call a model. Approval of a draft does not send it. Source intake status is not an index. Suggested department owners in the catalogue are prompts.

## Baseline

Node `v22.23.4`. Commands were run in `web/` on 8 November 2026.

| Step | Result |
| --- | --- |
| `npm ci` | 111 packages added. npm reported 5 audit findings (3 moderate, 2 high). Not changed in this phase. |
| `npm test` before `npm run build` | 19 passed, 1 failed. The HTTP test expects `/integrations/ethikcorp-runtime-starter.zip` from `dist/` when `NODE_ENV=production`. A clean tree has no `dist/`, so the zip returns 404. |
| `npm run build` then `npm test` | Build succeeded. 20 passed, 0 failed. The HTTP test ran a synthetic Sales proposal through review, memory, and a single handoff on a temporary store. |
| `npm run dev` | `http://127.0.0.1:5052/api/health` returned `ok`, `mode: local-preview`, `githubTokenConfigured: false`. |
| Browser | `#pm`, `#departments`, and `#departments/runtime` rendered. PM shows the nine-stage card path at 0/36. Departments shows nine empty workspaces and counts taken from local records (0 open, 0 reviews, 19 starters). Runtime shows Sim and Lobu as not configured, 0 of 19 mapped. |
| `npm run build:cloudflare` | Succeeded. All 18 asset hashes in `verification/cloudflare-deployment.json` match this build, including `assets/index-B7ZKyW49.js` and `assets/index-C8LPg0vW.css`. |
| Deploy | Not run. |

The dev server’s `.data` store was not used for the synthetic draft. Browser verification loaded the three routes. It did not click a draft through review; the HTTP test did that on a temporary store.

Current UI, from those screens: Fira Sans and Fira Code, mineral sidebar `#102e38`, teal marks, a dark hero with concentric rings, and a 3-column stage card grid. Department home repeats that pattern with a card directory. That is the surface this redesign replaces. The routes, copy boundaries, and server behavior stay.

## Directions

Each direction has one primary reference. Secondary references contribute one bounded detail. They are not averaged.

Screenshots: `design/directions/screenshots/`.

### 1. Field Ledger — recommended

Primary: Linear’s March 2026 refresh and its public issue row.

Preserve: warm-neutral light canvas, dimmer sidebar, 13px Inter, about 36px rows, status as a small mark, id in mono, main column ahead of chrome, compact 6px control radius, no cards, no gradient, no indigo chrome.

Borrow only: Attio’s attribute column for one selected source (owner, class, audience, freshness, permission, version). Stripe’s rule that color names a status, applied only to the mark and the status word.

Media: code-native UI. No generated imagery.

Reject: dark-mode default, indigo as the accent, serif display, bone `#faf7f2` editorial canvas, card grid, full-row status color.

Tokens adapted for this product, not scraped from Linear:

| Role | Value |
| --- | --- |
| Canvas | `#f7f6f3` |
| Sidebar | `#eceae4` |
| Ink | `#1c1917` (text and primary button only) |
| Muted text | `#5f5c56` |
| Faint text | `#6a675f` |
| Hairline | `#e2e0d9` |
| Status marks | idle `#5f5c56`, pending `#8a4b08`, processing `#0f5f78`, ready `#166534`, failed `#b42318`, denied `#9a3412` |

### 2. Registry Bench

Primary: Stripe’s data table and status map, with Ironclad’s turn banner.

Preserve: white canvas, the register is a real table, typed columns, status pills limited to Stripe’s six roles, empty and failure copy in the table, a banner that says whose turn it is.

Borrow only: Ironclad’s “current stage and next action” banner. The amber edge means the turn is waiting. It is not decoration.

Reject: Stripe blurple, Attio’s CRM chrome, a card around every row, Linear’s dark spec.

Tokens: canvas `#ffffff`, ink `#121212`, muted `#5c5c5c`, faint `#5f5f5f`, hairline `#e6e6e6`. Pill pairs are in the HTML and all measured above 4.5:1.

### 3. Run Tape

Primary: Vercel’s deployment-as-object, in light mode.

Preserve: a reverse-chronological run list, one status dot vocabulary (queued, running, ready, failed), the log in the same view as the run, mono for the log, hairlines instead of shadows.

Borrow only: Glean’s citation rule. The specimen says “No sources” and does not invent a document chip that would imply access.

Reject: dark-by-default, Geist claimed as installed, fake build timings, a dashboard of KPI cards.

Type: Inter and JetBrains Mono stand in for Geist Sans and Geist Mono.

Tokens: canvas `#ffffff`, ink `#171717`, muted `#666666`, faint `#5f5f5f`, log `#fafafa`, log dim `#5e5e5e`, dots queued `#a1a1aa`, running `#b45309`, ready `#157f3d`, failed `#d92d20`.

### Contrast

Ratios were calculated for the mockup pairs (WCAG relative luminance). They are not a conformance audit of the product.

Text used at 11–13px is at least 4.5:1. Examples: ink on the Field Ledger canvas 16.18; faint `#6a675f` on the canvas 5.23 and on the sidebar 4.69; Registry pills from 6.19 to 9.50; Run Tape log failure text `#d92d20` on `#fafafa` 4.63. Status dots are marks, not text.

The mockups include `:focus-visible` and `prefers-reduced-motion`. They are desktop frames at 1440×900. They are not an interactive keyboard implementation.

### Decision ledger

| Decision | Source | Role kept | Why |
| --- | --- | --- | --- |
| Light, dense, three places in the shell | User brief; Linear 2026 | Navigation recedes | Knowledge, decisions, and departments are different jobs |
| Inter, 13px, mono ids | User constraint; Linear row; Vercel log | Mono stays in ids and logs | Dense daily UI |
| No indigo, no serif, no bone canvas | Anti-averaging; indigo is not official | Accent is ink | Avoids the generic SaaS and editorial defaults |
| Status color only on state | Linear row; Stripe status map | Color is not chrome | Ingestion and automation must scan |
| Attribute rail | Attio record page | Provenance fields | Owner, version, audience, freshness, permission |
| Turn banner | Ironclad workflow page | Waiting on a person | A blocked source needs one next action |
| Run log and “no sources” | Vercel deployment; Glean citations | Citation grants nothing | Recovery and honesty about retrieval |
| Specimen rows labeled | User constraint | Not data | Shows pending, processing, ready, failed, denied without fake records |
| Ink `#1c1917` as text | Observed Aqion ink, used only as text | Not a page wash | Fits the warmer neutral without adopting bone or indigo |

## Recommendation

Lock **Field Ledger** as the shell.

The product is a daily register of sources, decisions, and department work. Linear’s list is the right primary object: many rows, quiet chrome, status that does not shout. Attio’s attribute column is how a selected source shows provenance without becoming a card. Stripe’s status names and Ironclad’s turn line should appear inside that shell, on the register and on a blocked row. Vercel’s run tape should become the Activity place, not the home. A deploy console would make business decisions look like builds.

Registry Bench is the right fallback if the first screen to ship is the source register alone. Run Tape is the right fallback if the first screen is activity and recovery. Do not blend the three into a warm card dashboard.

## Information architecture to build

Keep the current hashes working.

| Place | Hash | Job | Data that exists today |
| --- | --- | --- | --- |
| Knowledge | `#pm` | Catalogue, intake, ingestion, permissions, retrieval eval, fine-tune held separate | PM state in `localStorage`. Upload limited to five categories. |
| Decision desk | `#decisions` (new view, same app) | Gates, owners, drafts waiting, one next action | Checklist plus department runs in `pending_review`. No executive metrics. |
| Departments | `#departments` and `#departments/:id/:tab` | Execution for nine departments | Server store. Unchanged API. |
| Activity | department activity, plus a cross-department reading later | Log, handoff, recovery | `events` already recorded. |
| Runtime | `#departments/runtime` | Disconnected Sim and Lobu, starter download | Unchanged. |

Ingestion states to show, distinct from intake (`not-started`, `located`, `uploaded`, `excluded`):

`not connected`, `pending`, `processing`, `ready`, `failed`.

Until an index exists, live rows stay `not connected`. Processing, ready, and failed may appear only as labeled specimens or as real job receipts. They must not be implied by a checklist tick.

Automation states already in the server, and the labels to keep: `todo`, `in_progress`, `blocked`, `done`, `running`, `queued`, `pending_review`, `approved`, `rejected`, `failed`, `needs_reconciliation`. Draft, running, failed, and completed are these states, not a new hidden machine. An approved run remains a local draft.

Retrieval evaluation is its own place. Fine-tune stays a closed row: not started, not a way to keep facts current.

## Department tools

These are the tools already defined in `web/shared/departments.json`. They are templates. They are not live integrations. Partners are dependencies, not data sharing.

| Department | Tailored tools | Depends on |
| --- | --- | --- |
| Sales & BD | Lead qualification, proposal brief, follow-up draft | Marketing claims, Finance commercial inputs, Legal review, Delivery handoff |
| Marketing | Social pack, article outline | Legal claims, Client Success permissioned proof, Sales services |
| Consulting Delivery | Training-needs pack, 30/60/90 evaluation | Signed Sales scope, HR role constraints, Operations dates |
| Technology & AI | Automation assessment, agent requirements | Delivery process, Operations systems, an approved model route |
| Finance | Invoice preparation brief, expense pack | Sales terms, Legal contract facts. Ledger posting stays with Finance |
| HR & Talent | Role description, onboarding plan | Operations access, Finance, Legal. Personal records stay excluded |
| Operations | Weekly status, minutes and action register | Delivery, Client Success, Finance, HR, Technology |
| Client Success | Check-in, outcome evidence pack | Sales, Delivery, Marketing permissions, Operations |
| Legal & Compliance | Clause issue list, NDA brief | Sales, Finance, HR, Marketing claims. A lawyer decides |

A handoff copies a written summary onto the partner workboard. It does not copy files, memory, or credentials. That rule stays.

## Implementation scope for the next pass

After one direction is locked:

1. Add Field Ledger tokens and Inter. Remove the hero rings, stage-card grid, and department-card directory. Keep Fira out of the new shell.
2. Rebuild `#pm` as the source list plus attribute rail. Map the existing record fields. Do not invent owners, locators, or freshness.
3. Add `#decisions` as a composed reading of checklist gates and `pending_review` drafts. Show “baseline not supplied” wherever a measure has no client number.
4. Restyle department workboards, review, memory, and activity as lists with the same status marks. Keep every current route, form, and API.
5. Put the run tape on activity: local template, failed remote start, and `needs_reconciliation`, with the “do not retry an uncertain run” rule.
6. States for loading, empty, error, and denied. Denied stays a server result, not only a hidden button.
7. Keyboard: roving tabindex on the source list, Enter to open, visible focus. Add shortcuts only where they match a control that exists.
8. Tables scroll on narrow widths with a sticky first column. Sidebar collapses to the place names. Honor `prefers-reduced-motion`.
9. Add a contrast check for the token pairs before any conformance wording. This document’s ratios are not that test.
10. Re-run `npm test` and `npm run build:cloudflare`. Compare behavior on `#pm`, `#departments`, and `#departments/runtime`.

Do not, in that pass:

- Deploy, or change the Worker that serves `https://ethikcorp-superbrain.aqionlabs.workers.dev`.
- Provision databases, GPU, model endpoints, or paid Cloudflare resources.
- Set `RUNTIME_EGRESS_APPROVED`, add Sim or Lobu credentials, or call a model from the browser.
- Upload company files or seed fictional employee work.
- Restart or add a background bot. There is no scheduler here; do not create one.
- Treat a Cloudflare hostname as offline capability or UAE residency.
- Change a marketing site. This repository does not contain that site, and packaging is a separate decision.

## Deployment path and blockers

The compatible path is already in `web/package.json` and `web/cloudflare/README.md`:

1. `npm test`
2. `npm run build:cloudflare`
3. `npm run cloudflare:dev` for a local Worker check
4. `npm run cloudflare:deploy` only after the preview owner’s approval

This phase ran steps 1 and 2. Step 2 matches the recorded release hashes. Steps 3 and 4 were not run.

Blockers before any publish:

- The Worker name is `ethikcorp-superbrain`, account `80114e86d2b31e6086ffa21c0ecda3ec` in `web/wrangler.toml`. Publishing replaces the existing preview. The handover requires the owner’s approval. A signed session secret is already on that Worker. Replacing it would cut browsers off their Durable Object workspaces.
- Rollback must not reset the Durable Object. PM data lives in each browser’s `localStorage`.
- The preview is global Cloudflare. It does not prove UAE processing or offline inference.
- No GitHub token, Sim key, Lobu token, or model provider is configured. The runtime route should stay unconfigured on that preview.
- There is no automatic deploy workflow. Do not add one that publishes on push.
- `npm test` on a clean checkout fails until `dist/` exists. The next pass should make the production static test build, or skip, explicitly, so a green test does not depend on a forgotten build.

## Files in this phase

- `design/DESIGN_PHASE.md`
- `design/directions/field-ledger.html`
- `design/directions/registry-bench.html`
- `design/directions/run-tape.html`
- `design/directions/screenshots/direction-field-ledger.png`
- `design/directions/screenshots/direction-registry-bench.png`
- `design/directions/screenshots/direction-run-tape.png`
