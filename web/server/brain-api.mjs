import { ownershipTemplate, parseWorkbook, validateOwnership } from "../phase1/customer-logic.mjs";
import { connectorStatus, emptyBrain, ingestDocument, portalAccess, residency } from "./brain-pipeline.mjs";
import { analyzeRevenue, projectModel } from "./datasets.mjs";
import { runAgent } from "./agent.mjs";
import { DEMO_DRIVE, DEMO_GITHUB, buildFromDemo, demoPlan, ingestDemoFile } from "./demo-intake.mjs";
import { llmStatus } from "./llm/status.mjs";
import { buildSemanticLayer } from "./semantic.mjs";

function finetuneStatus(instruction) {
  if (instruction?.validated) return { status: "not_executed", detail: `${instruction.pairs}-pair dataset exported and validated. The LoRA run has not been executed.` };
  return { status: "not_executed", detail: "Instruction dataset has not been exported. The LoRA run has not been executed." };
}

export function publicBrain(brain, role, connectors, env = {}) {
  const current = brain || emptyBrain();
  const access = portalAccess(role, current, env);
  const analysis = analyzeRevenue(current.datasets || {});
  return {
    ...access,
    documents: (current.documents || []).map((document) => ({ id: document.id, name: document.name, sourceId: document.sourceId, characters: document.text.length, sample: document.sourceId === "sample" })),
    chunks: (current.chunks || []).length,
    connectors: connectorStatus(connectors),
    residency: residency(),
    instruction: current.instruction || { exported: false, pairs: 0, validated: false, lora: "not_executed" },
    finetune: finetuneStatus(current.instruction),
    indexLayer: { retrieval: (current.chunks || []).length ? "built" : "not_built", semantic: current.semantic?.status || "not_built", instructionDataset: current.instruction?.validated ? `${current.instruction.pairs} pairs exported and validated; LoRA not executed` : "not_exported", finetune: "not_executed" },
    semantic: current.semantic || buildSemanticLayer(),
    quality: current.quality || null,
    demo: { github: current.demo?.github || DEMO_GITHUB, driveUrl: current.demo?.driveUrl || DEMO_DRIVE, sha: current.demo?.sha || current.quality?.sha || "", needsReingest: Boolean(current.demo?.needsReingest), drive: current.demo?.drive || null, filesTotal: current.demo?.filesTotal || 0, filesDone: current.demo?.filesDone || 0, log: current.demo?.log || [] },
    datasets: Object.entries(current.datasets || {}).map(([id, table]) => ({ id, rows: table.rows?.length || 0, sample: true, pass: table.validation?.pass !== false })),
    model: { ...projectModel(current.datasets || {}), updated: current.quality?.fetchedAt || "" },
    opportunities: analysis.opportunities,
    pins: current.pins || [],
    tasks: current.tasks || [],
    automations: current.automations || [],
    workflowMaps: current.workflowMaps || {},
    llm: llmStatus(env)
  };
}

const PIPELINE_APIS = new Set(["/api/brain/bootstrap-dev", "/api/brain/demo/plan", "/api/brain/demo/file", "/api/brain/documents", "/api/brain/confirm", "/api/brain/automation", "/api/brain/automation/toggle", "/api/brain/automation/run", "/api/brain/ownership-sample"]);

function portalMode(env) {
  return env?.PORTAL_MODE === "customer" || env?.PORTAL_MODE === "aqionteam" ? env.PORTAL_MODE : "production";
}

export function demoOwnershipRows() {
  return ownershipTemplate().map((row) => ({ ...row, ownerName: "Demo owner", dueDate: "2026-12-01", authority: "Authoritative", notForAi: row.notForAi ? "Yes" : "No" }));
}

export async function handleBrain(brain, { method, pathname, body, role, sessionId, secret, connectors, env, fetchImpl, onStep }) {
  const mode = portalMode(env);
  const current = brain || emptyBrain();
  const effective = mode === "customer" ? "customer" : role;
  if (mode === "customer" && (PIPELINE_APIS.has(pathname) || (pathname === "/api/brain/claim" && body?.trustedRole === "dev"))) {
    return { brain: current, status: 403, data: { error: "This customer portal does not expose the development view or the build pipeline.", portalMode: "customer", role: "customer" } };
  }
  if (mode === "aqionteam" && effective !== "dev" && pathname !== "/api/brain/claim" && pathname !== "/api/brain/bootstrap-dev") {
    return { brain: current, status: 401, data: { error: "The Aqion team portal needs a team invite.", portalMode: "aqionteam" } };
  }
  if (method === "GET" && pathname === "/api/brain/state") return { brain: current, status: 200, data: publicBrain(current, effective, connectors, env) };
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
    let next = { ...current, ownershipReady: true, ownership: result.rows };
    if (portalMode(env) === "customer") {
      try { next = await buildFromDemo(next, fetchImpl || fetch); }
      catch (error) { next = { ...next, demo: { ...(next.demo || {}), drive: { status: "pending", detail: error.message || "The build could not start." } } }; }
    }
    return { brain: next, status: 200, data: publicBrain(next, effective, connectors, env) };
  }
  if (method === "POST" && pathname === "/api/brain/demo/plan") {
    const plan = await demoPlan(fetchImpl || fetch);
    const next = { ...current, demo: { ...(current.demo || {}), github: plan.github, driveUrl: plan.driveUrl, drive: plan.drive, sha: plan.sha, driveIndex: plan.driveIndex, needsReingest: Boolean(current.quality?.sha && plan.sha && current.quality.sha !== plan.sha), filesTotal: plan.files.length, filesDone: current.demo?.filesDone || 0, log: current.demo?.log || [] } };
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
    const access = portalAccess(role, current, env);
    const area = body.area === "bots" ? "bots" : "brain";
    if (!access.tabs.find((tab) => tab.id === area)?.enabled) return { brain: current, status: 403, data: { error: area === "bots" ? "Ethikcorp Businessbots are still being built." : "Ethikcorp BusinessBrain is still building." } };
    const data = await runAgent(current, body.question || "", { ai: env?.AI, departmentId: body.departmentId, onStep });
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
  if (method === "POST" && pathname === "/api/brain/ownership-sample") {
    if (portalMode(env) !== "aqionteam") return { brain: current, status: 403, data: { error: "The demo ownership sample is only available on the Aqion team portal." } };
    const result = validateOwnership({ ok: true, rows: demoOwnershipRows() });
    if (!result.ok) return { brain: current, status: 422, data: { ok: false, errors: result.errors } };
    const next = { ...current, ownershipReady: true, ownership: result.rows };
    return { brain: next, status: 200, data: publicBrain(next, "dev", connectors, env) };
  }
  if (method === "GET" && pathname === "/api/brain/connectors") return { brain: current, status: 200, data: connectorStatus(connectors) };
  return { brain: current, status: 404, data: { error: "Unknown brain endpoint." } };
}
