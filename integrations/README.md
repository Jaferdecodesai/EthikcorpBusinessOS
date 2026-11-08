# Ethikcorp runtime starter

Reviewed 18 October 2026.

- lobu/: nine department role directories and desired-state config pinned to @lobu/cli 22.0.0. Requires Node 22+ within the CLI's supported range.
- sim/workflows/: nineteen native starter workflow documents, Start -> Function. These generate structured templates without model/connector calls. No live import or deployment has occurred.
- sim/briefs/: the client inputs, output contract and recommended model/retrieval extension for every workflow.

Read SIM_LOBU_RESEARCH_AND_SETUP.md for findings, setup, boundaries and verification.

Lobu: install dependencies, run npm run validate, choose approved provider/model and policies, authenticate to the intended private deployment, review the plan, then apply. No tool grants or background schedules are silently provisioned.

Sim: import one JSON file using the private UI or documented v2 import API, inspect the canvas and synthetic run, deploy privately, then record its ID in SIM_WORKFLOW_MAP on the Superbrain server. Repeat only after acceptance. The documents target the inspected upstream shape and still need live import validation.

No secrets or client records are included.
