# Technology & AI: AI agent requirements

Prepare an agent specification with tools, sources and release tests.

Input fields: objective (required text), sourceRefs (text), reviewer (text), department (text).

Client brief: Role, users, sources, allowed actions, prohibited actions, escalation and operating region.

Output sections: Mandate and users; Sources and permissions; Tools and action policy; Escalation and fallback; Evaluation and observability; Release reviewer.

The JSON starter contains Start -> Function, with a terminal structured template result. It has no model call, source retrieval or external action. Import it as a draft, inspect and run a synthetic sample, then deploy privately and map the ID in Superbrain PM. To add model assistance, insert an Agent block using an approved endpoint and source-scoped retrieval, verify its structured output, and retain the application review queue.
