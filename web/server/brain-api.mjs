import { parseWorkbook, validateOwnership } from "../phase1/customer-logic.mjs";
import { answerFromChunks, connectorStatus, emptyBrain, ingestDocument, portalAccess, residency } from "./brain-pipeline.mjs";
export function publicBrain(brain, role, connectors) {
  const access = portalAccess(role, brain || emptyBrain());
  return {
    ...access,
    documents: (brain.documents || []).map((document) => ({ id: document.id, name: document.name, sourceId: document.sourceId, characters: document.text.length })),
    chunks: (brain.chunks || []).length,
    connectors: connectorStatus(connectors),
    residency: residency(),
    finetune: { status: "not_runnable_here", detail: "A LoRA job can be queued for Unsloth or Axolotl outside this Worker. Nothing is training here." }
  };
}

export async function handleBrain(brain, { method, pathname, body, role, sessionId, secret, connectors }) {
  const current = brain || emptyBrain();
  if (method === "GET" && pathname === "/api/brain/state") return { brain: current, status: 200, data: publicBrain(current, role, connectors) };
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
    return { brain: next, status: 200, data: publicBrain(next, role, connectors) };
  }
  if (method === "POST" && pathname === "/api/brain/documents") {
    const result = ingestDocument(current, { name: body.name, text: body.text, sourceId: body.sourceId });
    if (!result.ok) return { brain: current, status: 415, data: { error: result.error } };
    return { brain: result.brain, status: 200, data: publicBrain(result.brain, role, connectors) };
  }
  if (method === "POST" && pathname === "/api/brain/ask") {
    const access = portalAccess(role, current);
    if (!access.tabs.find((tab) => tab.id === "brain")?.enabled) return { brain: current, status: 403, data: { error: "Ethikcorp BusinessBrain is still building." } };
    return { brain: current, status: 200, data: answerFromChunks(body.question || "", current.chunks || []) };
  }
  if (method === "POST" && pathname === "/api/brain/confirm") {
    if (role !== "dev") return { brain: current, status: 403, data: { error: "The development role confirms departments." } };
    if (!body.id) return { brain: current, status: 400, data: { error: "Name the department." } };
    const next = { ...current, confirmed: { ...current.confirmed, [body.id]: true } };
    return { brain: next, status: 200, data: publicBrain(next, role, connectors) };
  }
  if (method === "GET" && pathname === "/api/brain/connectors") return { brain: current, status: 200, data: connectorStatus(connectors) };
  return { brain: current, status: 404, data: { error: "Unknown brain endpoint." } };
}
