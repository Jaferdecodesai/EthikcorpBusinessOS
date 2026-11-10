import { parseWorkbook, validateOwnership } from "../phase1/customer-logic.mjs";
import { connectorStatus, emptyBrain, ingestDocument, portalAccess, residency } from "./brain-pipeline.mjs";
import { analyzeRevenue } from "./datasets.mjs";
import { runAgent } from "./agent.mjs";
import { DEMO_DRIVE, DEMO_GITHUB, demoPlan, ingestDemoFile } from "./demo-intake.mjs";
import { llmStatus } from "./llm/status.mjs";

export function publicBrain(brain, role, connectors, env = {}) {
  const current = brain || emptyBrain();
  const access = portalAccess(role, current);
  const analysis = analyzeRevenue(current.datasets || {});
  return {
    ...access,
    documents: (current.documents || []).map((document) => ({ id: document.id, name: document.name, sourceId: document.sourceId, characters: document.text.length, sample: document.sourceId === "sample" })),
    chunks: (current.chunks || []).length,
    connectors: connectorStatus(connectors),
    residency: residency(),
    finetune: { status: "not_runnable_here", detail: "A LoRA job can be queued for Unsloth or Axolotl outside this Worker. Nothing is training here." },
    demo: { github: current.demo?.github || DEMO_GITHUB, driveUrl: current.demo?.driveUrl || DEMO_DRIVE, drive: current.demo?.drive || null, filesTotal: current.demo?.filesTotal || 0, filesDone: current.demo?.filesDone || 0, log: current.demo?.log || [] },
    datasets: Object.entries(current.datasets || {}).map(([id, table]) => ({ id, rows: table.rows?.length || 0, sample: true })),
    opportunities: analysis.opportunities,
    pins: current.pins || [],
    tasks: current.tasks || [],
    automations: current.automations || [],
    workflowMaps: current.workflowMaps || {},
    llm: llmStatus(env)
  };
}

export async function handleBrain(brain, { method, pathname, body, role, sessionId, secret, connectors, env, fetchImpl }) {
  const current = brain || emptyBrain();
  if (method === "GET" && pathname === "/api/brain/state") return { brain: current, status: 200, data: publicBrain(current, role, connectors, env) };
  if (method === "POST" && pathname === "/api/brain/claim") {
    if (body.trustedRole !== "dev" && body.trustedRole !== "customer") return { brain: current, status: 401, data: { error: "That invite is not valid." } };
    return { brain: { ...current, roles: { ...current.roles, [sessionId]: body.trustedRole } }, status: 200, data: { role: body.trustedRole } };
  }
  if (method === "POST" && pathname === "/api/brain/bootstrap-dev") {
    if (current.devBootstrapClaimed) return { brain: current, status: 409, data: { error: "A development invite was already issued." } };
    return { brain: { ...current, devBootstrapClaimed: true }, status: 200, data: { claim: true }, signRole: "dev" };
  }
  if (method === "POST" && pathname === "/api/brain/ownership") {
    const parsed = body.xlsxBase64 ? await parseWorkbook(Uint8Array.from(atob(body.xlsxBase64), (char) => char.charCodeAt(0))) : { ok: true, rows: body.rows || [] };
    const result = validateOwnership(parsed);
    if (!result.ok) return { brain: current, status: 422, data: { ok: false, errors: result.errors } };
    const next = { ...current, ownershipReady: true, ownership: result.rows };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/demo/plan") {
    const plan = await demoPlan(fetchImpl || fetch);
    const next = { ...current, demo: { ...(current.demo || {}), github: plan.github, driveUrl: plan.driveUrl, drive: plan.drive, filesTotal: plan.files.length, filesDone: current.demo?.filesDone || 0, log: current.demo?.log || [] } };
    return { brain: next, status: 200, data: { ...publicBrain(next, role, connectors, env), files: plan.files } };
  }
  if (method === "POST" && pathname === "/api/brain/demo/file") {
    const result = await ingestDemoFile(current, body.path, fetchImpl || fetch);
    if (!result.ok) return { brain: current, status: 422, data: { error: result.error } };
    const log = [...(current.demo?.log || []).filter((item) => item.path !== body.path), { path: body.path, ok: true, sample: result.sample }];
    const next = { ...result.brain, demo: { ...result.brain.demo, filesTotal: current.demo?.filesTotal || result.brain.demo?.filesTotal || log.length, filesDone: log.length, log: log.slice(-80) } };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/documents") {
    const result = ingestDocument(current, { name: body.name, text: body.text, sourceId: body.sourceId });
    if (!result.ok) return { brain: current, status: 415, data: { error: result.error } };
    return { brain: result.brain, status: 200, data: publicBrain(result.brain, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/ask") {
    const access = portalAccess(role, current);
    const area = body.area === "bots" ? "bots" : "brain";
    if (!access.tabs.find((tab) => tab.id === area)?.enabled) return { brain: current, status: 403, data: { error: area === "bots" ? "Ethikcorp Businessbots are still being built." : "Ethikcorp BusinessBrain is still building." } };
    const data = await runAgent(current, body.question || "", { ai: env?.AI, departmentId: body.departmentId });
    return { brain: current, status: 200, data };
  }
  if (method === "POST" && pathname === "/api/brain/pin") {
    if (!body.chart?.id) return { brain: current, status: 400, data: { error: "Name the chart to pin." } };
    const pins = [...(current.pins || []).filter((chart) => chart.id !== body.chart.id), body.chart].slice(-12);
    const next = { ...current, pins };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/task") {
    const task = { id: `task-${Date.now()}`, title: String(body.title || "Revenue action").slice(0, 180), department: body.department || "Sales & BD", impactAed: Number(body.impactAed) || 0, formula: String(body.formula || ""), sample: true, createdAt: new Date().toISOString() };
    const next = { ...current, tasks: [...(current.tasks || []), task] };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/automation") {
    if (role !== "dev") return { brain: current, status: 403, data: { error: "The development role saves automations in this preview." } };
    const item = { id: body.id || `auto-${Date.now()}`, departmentId: body.departmentId, name: body.name, trigger: body.trigger, steps: body.steps || [], schedule: body.schedule || "Weekdays", hoursSavedPerMonth: body.hoursSavedPerMonth ?? null, formula: body.formula || "", impactAed: body.impactAed ?? null, aedFormula: body.aedFormula || "", enabled: false, runs: [], sample: true };
    const next = { ...current, automations: [...(current.automations || []).filter((row) => row.id !== item.id), item] };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/automation/toggle") {
    const next = { ...current, automations: (current.automations || []).map((item) => item.id === body.id ? { ...item, enabled: !item.enabled } : item) };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/automation/run") {
    const next = { ...current, automations: (current.automations || []).map((item) => item.id === body.id ? { ...item, runs: [...item.runs, { at: new Date().toISOString(), note: "Simulated run. Nothing was sent outside this preview." }] } : item) };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/confirm") {
    if (role !== "dev") return { brain: current, status: 403, data: { error: "The development role confirms departments." } };
    if (!body.id) return { brain: current, status: 400, data: { error: "Name the department." } };
    const next = { ...current, confirmed: { ...current.confirmed, [body.id]: true } };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors, env) };
  }
  if (method === "GET" && pathname === "/api/brain/connectors") return { brain: current, status: 200, data: connectorStatus(connectors) };
  return { brain: current, status: 404, data: { error: "Unknown brain endpoint." } };
}
