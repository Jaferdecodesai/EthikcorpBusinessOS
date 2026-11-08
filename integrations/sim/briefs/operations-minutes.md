# Operations: Minutes and action register

Turn approved meeting notes into a reviewable action record.

Input fields: objective (required text), sourceRefs (text), reviewer (text), department (text).

Client brief: Meeting purpose, confirmed decisions, action items, owners and dates. Supply only approved notes.

Output sections: Meeting purpose; Confirmed decisions; Actions with owners and dates; Open questions; Participant review.

The JSON starter contains Start -> Function, with a terminal structured template result. It has no model call, source retrieval or external action. Import it as a draft, inspect and run a synthetic sample, then deploy privately and map the ID in Superbrain PM. To add model assistance, insert an Agent block using an approved endpoint and source-scoped retrieval, verify its structured output, and retain the application review queue.
