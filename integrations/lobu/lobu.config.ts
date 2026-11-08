import { defineAgent, defineConfig, secret } from "@lobu/cli/config";
// Model and endpoint must be selected by the operator; unresolved models remain gated.
const model = process.env.LOBU_MODEL_ID;
const baseUrl = process.env.LOBU_MODEL_BASE_URL;
const agents = [
  {
    "id": "ethikcorp-sales",
    "name": "Sales & BD lead",
    "description": "Turn approved enquiries into qualified opportunities, evidence-backed proposals and complete delivery handoffs.",
    "dir": "./agents/sales"
  },
  {
    "id": "ethikcorp-marketing",
    "name": "Marketing lead",
    "description": "Plan and prepare brand-consistent content using approved claims and permissioned proof points.",
    "dir": "./agents/marketing"
  },
  {
    "id": "ethikcorp-delivery",
    "name": "Consulting Delivery lead",
    "description": "Translate signed scopes into diagnosis, programme design, delivery plans and measured evaluations.",
    "dir": "./agents/delivery"
  },
  {
    "id": "ethikcorp-technology",
    "name": "Technology & AI lead",
    "description": "Assess automation opportunities and specify bounded AI systems with tested tools, data routes and human escalation.",
    "dir": "./agents/technology"
  },
  {
    "id": "ethikcorp-finance",
    "name": "Finance lead",
    "description": "Prepare finance work for review while preserving the accounting system as the source of truth.",
    "dir": "./agents/finance"
  },
  {
    "id": "ethikcorp-hr",
    "name": "HR & Talent lead",
    "description": "Prepare role and onboarding materials from approved policies while keeping personal employee records restricted.",
    "dir": "./agents/hr"
  },
  {
    "id": "ethikcorp-operations",
    "name": "Operations lead",
    "description": "Coordinate owners, dates, programme logistics and actionable status across agreed department handoffs.",
    "dir": "./agents/operations"
  },
  {
    "id": "ethikcorp-client-success",
    "name": "Client Success lead",
    "description": "Coordinate follow-through, evaluation milestones, feedback and permissioned proof of client outcomes.",
    "dir": "./agents/client-success"
  },
  {
    "id": "ethikcorp-legal",
    "name": "Legal & Compliance lead",
    "description": "Prepare issue lists and document requests for qualified review, with controlled contracts, permissions and claims.",
    "dir": "./agents/legal"
  }
].map(agent => defineAgent({
  ...agent,
  providers: [{ id: "uae-inference", ...(model ? { model } : {}) }],
  network: { allowed: [], denied: [] },
  guardrails: ["secret-scan", "pii-scan"],
}));
// Current Lobu action policies are administered in Settings > Policies.
// Do not add the removed agent.tools block shown in some older docs.
export default defineConfig({
  org: "ethikcorp", orgName: "Ethikcorp", agents, prune: false,
  ...(baseUrl && model ? { providers: [{ slug: "uae-inference", kind: "openai", displayName: "Approved UAE inference", key: secret("UAE_MODEL_API_KEY"), capabilities: { text: { base_url: baseUrl, model } } }] } : {}),
});
