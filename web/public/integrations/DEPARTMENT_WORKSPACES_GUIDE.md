# Ethikcorp department dashboards and workspaces

Open `http://127.0.0.1:5052/#departments` while the local server is running. The Brain creation PM links to the department directory, and the department navigation links back to the PM. Every department has a direct hash route, for example `#departments/sales/dashboard`.

## Nine departments

Sales & BD; Marketing; Consulting Delivery; Technology & AI; Finance; HR & Talent; Operations; Client Success; Legal & Compliance.

Each dashboard has a distinct mandate, proposed measures, source categories, partner departments and workflow starting points. Operational counts derive from current local records. Empty workspaces do not contain fictional employee work or measured productivity.

## Daily use

- **Dashboard:** inspect open work, blockers, drafts awaiting review and active memory. Select a starter task to add it to the department workboard.
- **Workboard:** create work, assign a person and due date, and move it through To do, In progress, Blocked and Done. The backend scopes IDs to the selected department.
- **Lead workspace:** name the accountable human lead, pause local lead requests/workflow starts, and keep a persistent department conversation. Local planner mode uses rules over current records. Lobu mode becomes available after approved server configuration.
- **Memory:** record a note with reviewer and provenance. Correct it by superseding the earlier note or retire it. Memory is local working context; it is not a live GBrain index or an authenticated source-access grant.
- **Workflows:** choose a department-specific brief, provide facts and references, and prepare a local structured template. A configured deployed Sim mapping can execute externally and supply a run receipt.
- **Review queue:** inspect and download output; approve or reject with a named reviewer and note. Review is bound to the output hash. An approved draft remains a local reviewed artifact.
- **Knowledge:** see the relevant source categories and metadata from the Brain creation PM. Source intake status does not mean documents have been indexed or permissions tested.
- **Activity & handoffs:** inspect durable local events and send a specifically written summary to an allowed partner's local workboard. The handoff does not copy source files, memory or credentials.
- **Export:** download the selected department's local workspace as JSON.

## Runtime setup

The Runtime setup page reports configured endpoints and mappings without showing credentials. It links to the research notes and a downloadable starter pack containing nine Lobu role directories and nineteen Sim native workflow starter documents/briefs.

See [research and setup](SIM_LOBU_RESEARCH_AND_SETUP.md) for API details, version findings and the exact boundary between local behavior, tested contracts and live service acceptance.

## Storage and operation

Run from `web` with `npm run dev`. Local department state is stored in `web/.data/departments.json`, which is ignored by Git and written with restrictive file permissions. Back it up through the approved local process. PM intake metadata remains in its existing browser storage and is read into the department source view on entry.

This is a local single-operator application. Switching departments is navigation, not employee authorization. Production rollout requires verified identities, server-side tenant/department/engagement permissions, a transactional database, approved source/model routing, background job operations, backup/deletion tests and client acceptance. No external sends, publications, signatures, ledger postings or employment decisions are executed by the local workspace.
