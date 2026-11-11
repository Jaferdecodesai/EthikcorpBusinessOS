export const WORKERS_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
export const REGION_LINE = "Cloudflare Workers AI – not UAE-resident; UAE North option ready";

export function llmStatus(env = {}) {
  const missing = ["AZURE_OPENAI_ENDPOINT", "AZURE_OPENAI_KEY", "AZURE_OPENAI_DEPLOYMENT"].filter((key) => !env[key]);
  return {
    provider: env.AI ? "workers-ai" : "not_configured",
    model: env.AI ? WORKERS_MODEL : null,
    embedding: env.AI ? EMBEDDING_MODEL : "prototype-hashing",
    region: REGION_LINE,
    azure: { id: "azure-openai-uae-north", ready: missing.length === 0, missing }
  };
}

const TOOLS = ["search_brain", "query_dataset", "make_chart", "analyze_revenue", "propose_automation", "create_task"];

export async function workersAiPlan(ai, question) {
  if (!ai?.run) return null;
  try {
    const result = await ai.run(WORKERS_MODEL, {
      messages: [
        { role: "system", content: "Plan up to 5 tool calls. Reply with a JSON array only, like [{\"tool\":\"query_dataset\"},{\"tool\":\"make_chart\"},{\"tool\":\"analyze_revenue\"}]. Tools: search_brain, query_dataset, make_chart, analyze_revenue, propose_automation, create_task. Do not invent numbers." },
        { role: "user", content: String(question || "").slice(0, 1000) }
      ]
    });
    const text = typeof result?.response === "string" ? result.response : JSON.stringify(result || {});
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const parsed = start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : [];
    return parsed.filter((item) => TOOLS.includes(item?.tool)).slice(0, 5);
  } catch { return null; }
}

export async function workersAiNarrate(ai, question, outputs) {
  if (!ai?.run) return null;
  try {
    const result = await ai.run(WORKERS_MODEL, {
      messages: [
        { role: "system", content: "Write a short CEO answer using only the JSON tool outputs. Every number must already appear in that JSON. Cite a document name when search_brain returned one. Do not add figures." },
        { role: "user", content: JSON.stringify({ question, outputs }).slice(0, 12000) }
      ]
    });
    const text = typeof result?.response === "string" ? result.response : "";
    return narrativeIsGrounded(text, outputs) ? text.trim() : null;
  } catch { return null; }
}

export function narrativeIsGrounded(text, outputs) {
  const allowed = new Set();
  const walk = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) allowed.add(String(value));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(outputs);
  const used = String(text || "").match(/\d[\d,]*(?:\.\d+)?/g) || [];
  return used.length === 0 || used.every((raw) => allowed.has(raw.replace(/,/g, "")));
}
