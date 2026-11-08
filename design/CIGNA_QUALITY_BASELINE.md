# Cigna quality baseline

Inspected 8 November 2026 at https://cigna-quote-in-seconds.aqionlabs.workers.dev/. The Cigna app was not modified. It is the minimum visual quality for Aqion Superbrain. Looking like it does not make this product enterprise-mature.

## What the rendered app actually does

Desktop 1440 and mobile 390. Census, rate, underwriting, reports and compliance were opened. A sample click without employer consent was refused: the consent row gained an amber ring and a red toast said to confirm consent first. That is the interaction bar: the page tells you why a step is blocked.

## Observed craft

- Shell: indigo sidebar `#0F007C`, 240px, blue mark, 14px product name, 11.5px subtitle, uppercase 11px group labels, active item with a leaf bar.
- Page: `#F6F7FB` with a 32px indigo grid, sticky frosted white topbar, context on the left, status pills on the right.
- Type: Inter 14/1.5 for UI. Fraunces 600 at 30px for the page title only. Eyebrow is 11.5px Inter, blue, tracked uppercase.
- Cards: white, 12px radius, `#E3E6F0` border, a very small indigo shadow. 20px padding. 16px gaps.
- Journey: a five-step stepper. Current step is a blue circle with a blue halo. Completed steps go green.
- Controls: `#0033FF` buttons, white ghost buttons, segmented levers, a real slider, toggles.
- Data: sticky table headers, tabular numbers, 26px KPI figures, horizontal bars, empty states with one sentence.
- One dark indigo panel is reserved for the price. It is not a page background.
- Honesty is in the chrome: “DEMO DATA”, “Illustrative demo rates, not Cigna rates”, “Design option · not deployed”, simulated Salesforce.
- Mobile: the sidebar becomes one scrolling row. The stepper keeps numbers and drops labels. Cards stack.

Cigna’s muted `#7A7F99` measures about 3.9:1 on white, and the green and amber pill text also miss 4.5:1. Superbrain keeps the same palette and darkens those text roles (`#555A72`, `#046B3C`, `#8A5A12`, `#9F2422`) so the small text clears 4.5:1. Button blue `#0033FF` with white is 7.2:1.

The customer-facing product name is Aqion Superbrain. Businessbots remains the department module name.

## How this portal uses it

Dominant: Cigna’s shell, type, grid, cards, stepper, pills, KPI row and empty states.

Borrowed only from Fluent and Fiori: a full-width command context, semantic status that always has words, and an overview made of a chart plus a register. Horizon blue is not the brand. The three earlier mockups are not the design.

## Where the new screens go past that floor

- CEO desk is an overview of the nine real workspaces, not a single quote. Drilldown links open the department that owns the row. The open-work count changed to 1 after a real handoff.
- Formation is a nine-stage customer journey with a guide that answers from the current checklist, cites `source:` and `stage:` ids, lists missing owners, and keeps follow-ups as draft, pending or approved without sending them.
- Voice is a separate state: supported or not, consent, text fallback, and a disconnected UAE adapter. Browser speech is not described as sovereign.
- Knowledge separates the global Cloudflare front end from storage, backups, logs, embeddings, inference, egress and speech. Every plane says not verified.
- Department workspaces keep the 19 templates, label them local, and still bind review to the output hash. A synthetic Sales proposal was approved and handed to Consulting Delivery once. Autonomous routines were not started.
