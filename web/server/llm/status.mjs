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

export async function workersAiPlan(ai, question) {
  if (!ai?.run) return null;
  try {
    const result = await ai.run(WORKERS_MODEL, {
      messages: [
        { role: "system", content: "Choose one tool name from search_brain, query_dataset, make_chart, analyze_revenue, propose_automation, create_task. Reply with JSON {\"tool\":\"name\"} only. Do not invent numbers." },
        { role: "user", content: String(question || "").slice(0, 1000) }
      ]
    });
    const text = typeof result?.response === "string" ? result.response : JSON.stringify(result || {});
    const match = text.match(/search_brain|query_dataset|make_chart|analyze_revenue|propose_automation|create_task/);
    return match ? match[0] : null;
  } catch { return null; }
}
