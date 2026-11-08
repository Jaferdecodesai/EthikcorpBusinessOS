# Superbrain PM

**Ethikcorp creation-stage web app** · Local preview · 17 October 2026

## What the app does

Superbrain PM guides the nine steps described in the supplied Ethikcorp setup reference: discovery and inventory, collection, cleaning and dedupe, PII handling, chunking and metadata, embeddings and vectors, role-based access, evaluation, and refresh cadence. Each step has its own left-sidebar tab, an explanation, client inputs, four evidence-based checklist items, and an exit gate. There is one checklist, in the right-hand panel on desktop. Selecting a task opens its work area in the main panel; its separate checkbox records completion only after client evidence has been approved. A checklist tick does not approve data, access, or deployment.

At the top of **Discovery & inventory**, clients can download an editable Word template and a PDF review copy. The template covers project roles, hosting and access boundaries, all 18 source categories, source ownership and authority, rights, refresh, approval references and client sign-off. Selecting **Assign source owners (18 categories)** shows all 18 categories in the app with editable named-owner and inclusion/exclusion fields. Suggested departmental leads are prompts, not confirmed Ethikcorp assignments. Those edits save in this browser and can be included in the exported plan.

The Collection tab includes all **18 source categories** from pages 4–5 of the reference PDF. For each it shows the examples, usual location, proposed use, sensitivity and default owner, plus instructions to find and prepare the material. Clients can record a named owner, original source URL/folder, client approval reference, decision and note. Search and status filters help work through the inventory. Approved small files in five Public/Internal categories can be uploaded to a **private GitHub repository** after a server-side token is configured.

The app deliberately labels three different states:

1. **GitHub source storage:** approved files and PM metadata are committed to a private repo.
2. **GBrain import:** a separate inspect/preview/approval process would ingest clean committed Markdown. It is not executed by this app.
3. **Vector index:** local PGLite is the trial route; production PostgreSQL/pgvector in a client-approved UAE environment is a future integration. Uploading a file does not create embeddings.

The published [Supabase hosted-region list](https://supabase.com/docs/guides/platform/regions) does not list a UAE region. A hosted Supabase project is therefore **not a confirmed UAE-only vector store** for this design. A self-hosted compatible PostgreSQL/pgvector service in approved UAE infrastructure remains a possible later path, subject to deployment review.

## Run locally

From the project workspace:

```bash
cd web
npm install
npm run dev
```

Open **http://127.0.0.1:5052**. The server listens on the local loopback interface. Checklist and inventory edits save automatically in this browser's local storage; **Export plan** downloads a JSON backup.

To enable GitHub operations, create `web/.env.local` from `web/.env.example`, set a fine-grained `GITHUB_TOKEN` with contents access to the intended **private** repository, then restart the server. Enter the repository owner, name, branch and PM folder in the Collection tab. Use **Test private repo** before Save, Load or upload. The token stays on the server and must not be pasted into the page. An upload also requires a named owner, original locator and client approval reference. The app refuses a public repository and blocks uploads for the other 13 source categories in this pilot. Maximum upload size is 5 MB, with Markdown, text, PDF and DOCX accepted as source files; non-Markdown files still need reviewed conversion for GBrain.

No GitHub repository or credential was supplied in this task, so no remote repository was created or connected. The GitHub API calls are implemented but not live-tested against Ethikcorp's account.

## What is implemented and what is pending

| Capability | Current state |
| --- | --- |
| Nine-stage navigation, single right-hand checklist and local persistence | Implemented and locally tested |
| Discovery task roster with all 18 categories and client template downloads | Implemented and locally tested |
| Source inventory, filters, owner/location fields and preparation guidance | Implemented for all 18 reference categories |
| Automatic PM next-action suggestions | Not in this revised creation-stage UI; no LLM call or autonomous external action |
| Private GitHub connection, plan sync/load and approved-file upload | Implemented server-side; needs client repo and token for live test |
| GBrain import, OCR, embeddings, vector search and citations | Proposed pipeline only; not executed by this app |
| Supabase or UAE PostgreSQL connection | Architecture field and guidance only; not provisioned |
| Authenticated multi-user roles, approval workflow and audit database | Future production work |
| Department dashboards and workspaces | Implemented locally for nine departments, with nineteen workflow starting points and persistent local records |
| Live persistent Lobu specialists and Sim deployments | Adapters and starter configuration supplied; live environment and credentials still required |

## Operating boundary

Open `#departments` from the PM navigation to use the new department layer. See the [department workspace guide](DEPARTMENT_WORKSPACES_GUIDE.md) and [Sim/Lobu research notes](SIM_LOBU_RESEARCH_AND_SETUP.md). Department records persist on the local server; the PM intake remains in browser storage. Department navigation is not authenticated employee authorization.

The reference PDF is a **prototype review**, not proof of live integrations or measured productivity. This app uses its data-source table as a planning inventory, not as permission to ingest every category. Even a small dataset can contain sensitive client, HR, finance or legal material; the GitHub pilot upload is limited to selected approved categories, while the remaining categories can be tracked as metadata. A production rollout needs client-owned access decisions, authenticated server-side authorization, signed data-flow terms, storage and model residency verification, extraction review, GBrain integration and the [proposed test plan](ETHIKCORP_TEST_PLAN.md).
