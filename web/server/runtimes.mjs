import { randomUUID } from "node:crypto";

export function runtimeConfig(env = process.env) {
  const parse = (key) => { try { const v = JSON.parse(env[key] || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; } };
  return { approved: env.RUNTIME_EGRESS_APPROVED === "true", simBase: env.SIM_BASE_URL || "", simKey: env.SIM_API_KEY || "", simMap: parse("SIM_WORKFLOW_MAP"), lobuBase: env.LOBU_BASE_URL || "", lobuToken: env.LOBU_API_TOKEN || "", lobuOrg: env.LOBU_ORG || "", lobuMap: parse("LOBU_AGENT_MAP") };
}
export function runtimeStatus(config) {
  return { egressApproved: config.approved, sim: { configured: Boolean(config.simBase && config.simKey), baseUrl: config.simBase, mappedWorkflows: Object.keys(config.simMap) }, lobu: { configured: Boolean(config.lobuBase && config.lobuToken), baseUrl: config.lobuBase, org: config.lobuOrg, mappedAgents: Object.keys(config.lobuMap) }, verification: "Configuration only. A successful run supplies execution evidence." };
}
function endpoint(base) {
  const url = new URL(base);
  if (url.username || url.password || url.search || url.hash) throw new Error("Runtime URL must not contain credentials, query or fragment.");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Runtime requires HTTPS or a loopback URL.");
  return url.toString().replace(/\/$/, "");
}
async function jsonResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Runtime request failed (${response.status}). ${String(body?.error?.message || body?.error || "Check server credentials and scopes.").slice(0, 250)}`);
  return body;
}
export async function executeSim(config, workflowId, input, runId, fetcher = fetch) {
  if (!config.approved || !config.simBase || !config.simKey) throw new Error("Sim is not enabled. Configure the server runtime and approved data route first.");
  const remoteId = config.simMap[workflowId];
  if (typeof remoteId !== "string" || !/^[a-zA-Z0-9_-]{1,150}$/.test(remoteId)) throw new Error("This workflow has no deployed Sim workflow mapping.");
  const base = endpoint(config.simBase);
  let response;
  try { response = await fetcher(`${base}/api/v2/workflows/${encodeURIComponent(remoteId)}/execute`, { method: "POST", headers: { "X-API-Key": config.simKey, "X-Run-Id": runId, "Content-Type": "application/json" }, body: JSON.stringify({ input, async: true }), signal: AbortSignal.timeout(20000), redirect: "error" }); }
  catch { const error = new Error(`Sim did not return an acknowledgement. Reconcile request ${runId} before retrying; the remote run may have started.`); error.uncertain = true; throw error; }
  if ([409, 502, 503, 504].includes(response.status)) { const error = new Error(`Sim returned ${response.status}. Reconcile request ${runId} before retrying; execution is uncertain.`); error.uncertain = true; throw error; }
  const body = await jsonResponse(response);
  const data = body.data;
  if (!data || typeof data.runId !== "string") { const error = new Error("Sim response omitted a run receipt. Reconcile the original run ID before retrying."); error.uncertain = true; throw error; }
  return { remoteWorkflowId: remoteId, remoteRunId: data.runId, remoteStatus: data.status || "queued", output: data.output, error: data.error || null };
}
export async function pollSim(config, run, fetcher = fetch) {
  if (!config.approved || !config.simKey) throw new Error("Sim runtime is not enabled.");
  const body = await jsonResponse(await fetcher(`${endpoint(config.simBase)}/api/v2/workflows/${encodeURIComponent(run.remoteWorkflowId)}/runs/${encodeURIComponent(run.remoteRunId)}?includeOutput=true`, { headers: { "X-API-Key": config.simKey }, signal: AbortSignal.timeout(20000), redirect: "error" }));
  return body.data;
}
export async function sendLobu(config, department, prompt, messageId = randomUUID(), fetcher = fetch) {
  if (!config.approved || !config.lobuBase || !config.lobuToken) throw new Error("Lobu is not enabled. Configure the server runtime and approved data route first.");
  const root = endpoint(config.lobuBase);
  const gateway = root.endsWith("/lobu") ? root : `${root}/lobu`;
  const agentId = config.lobuMap[department] || `ethikcorp-${department}`;
  const orgHeader = config.lobuOrg ? { "x-lobu-org": config.lobuOrg } : {};
  const session = await jsonResponse(await fetcher(`${gateway}/api/v1/agents`, { method: "POST", headers: { Authorization: `Bearer ${config.lobuToken}`, "Content-Type": "application/json", ...orgHeader }, body: JSON.stringify({ agentId, thread: `ethikcorp-${department}-workspace` }), signal: AbortSignal.timeout(15000), redirect: "error" }));
  if (!session.agentId || !session.token) throw new Error("Lobu did not return a session receipt.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  const headers = { Authorization: `Bearer ${session.token}`, ...orgHeader };
  let output = "";
  const consume = async () => {
    const stream = await fetcher(`${gateway}/api/v1/agents/${encodeURIComponent(session.agentId)}/events`, { headers, signal: controller.signal, redirect: "error" });
    if (!stream.ok || !stream.body) throw new Error("Lobu event stream could not be opened.");
    const reader = stream.body.getReader(); const decoder = new TextDecoder(); let buffer = "", event = "";
    try { while (true) {
      const { done, value } = await reader.read(); if (done) return { status: "pending", text: output || "The remote session closed before completion. Check Lobu before sending again." };
      buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (!line.startsWith("data:")) continue;
        let data; try { data = JSON.parse(line.slice(5)); } catch { continue; }
        const matches = data.messageId === messageId || data.turnMessageId === messageId || data.processedMessageIds?.includes(messageId);
        if (!matches) continue;
        if (event === "output" && typeof data.content === "string") output += data.content;
        if (event === "complete") return { status: "completed", text: data.finalText || output || "Lobu completed without a text reply." };
        if (event === "error") return { status: "failed", text: String(data.error || "Lobu reported an error.") };
        if (["tool-approval", "question"].includes(event)) return { status: "needs_attention", text: output || "The specialist needs a response in Lobu. Open the gateway to review the request." };
        if (event === "ephemeral") return { status: "needs_attention", text: data.content || "Lobu requires attention." };
      }
    } } finally { await reader.cancel().catch(() => {}); }
  };
  const streaming = consume().then((result) => result, () => ({ status: "pending", text: output || "No final response was received. The remote turn may still be running; reconcile it in Lobu." }));
  try {
    try { await jsonResponse(await fetcher(`${gateway}/api/v1/agents/${encodeURIComponent(session.agentId)}/messages`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ content: prompt, messageId }), signal: controller.signal, redirect: "error" })); }
    catch { return { status: "pending", text: `Lobu did not acknowledge message ${messageId}. Check the existing session before sending again; it may still be processing.`, sessionId: session.agentId, messageId }; }
    return { ...await streaming, sessionId: session.agentId, messageId, thread: session.threadId || session.thread || `ethikcorp-${department}-workspace` };
  } finally { clearTimeout(timer); controller.abort(); await streaming; }
}
