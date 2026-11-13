import http from "node:http";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { Github, validateRepo, validateUpload, cleanPMState } from "./github.mjs";
import { createDepartmentStore, handleDepartmentApi } from "./departments.mjs";
import { ceoDashboard, ceoDepartment } from "./ceo-dashboard.mjs";
import { handleBrain, publicBrain } from "./brain-api.mjs";
import { departmentGate, emptyBrain } from "./brain-pipeline.mjs";
import { readInvite, signInvite } from "./invites.mjs";
import { runtimeConfig } from "./runtimes.mjs";
import { handoffConfig, stageHandoff, verifyHandoffDestinations } from "./stage-handoff.mjs";
import { askRelease, deployCandidate, evaluateCandidate, releaseState, sourceInventory } from "./brain-release.mjs";
import { withdrawSource } from "./source-lifecycle.mjs";
import { ownershipTemplate, workbookFor } from "../phase1/customer-logic.mjs";
import { createTeamIdentity, teamConfig, teamPermits } from "./team-identity.mjs";
import { answerFromReleaseModel, releaseModelConfig } from "./llm/release-answer.mjs";
import { answerBusinessMetric, businessTemplate } from "./business-intake.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
const port = Number(process.env.PORT || 5052);
const github = new Github(process.env.GITHUB_TOKEN || "");
const localSecret = process.env.SESSION_SECRET || "local-cloudflare-preview-only-secret-not-for-deployment";
const localBuild = process.env.BRAIN_LOCAL_DEVELOPMENT === "true" && process.env.PORTAL_MODE !== "customer";
const team = teamConfig(process.env);
if (process.argv.includes("--require-team")) {
  if (!team) throw new Error("Configure Cloudflare Access and the team roster before starting the team portal.");
  const stores = [process.env.BRAIN_DATA_FILE, process.env.DEPARTMENT_STORE_PATH];
  if (!stores.every((file) => file && path.isAbsolute(file)) || path.resolve(stores[0]) === path.resolve(stores[1])) {
    throw new Error("Set distinct absolute paths on persistent storage for the brain and department stores.");
  }
  if (!fs.existsSync(path.join(root, "dist/index.html"))) throw new Error("Build the standard Node portal before starting the team portal.");
}
const identifyTeamMember = team && createTeamIdentity(team);
const managedBuild = Boolean(team || localBuild);
const releaseModel = releaseModelConfig(process.env);
const brainEnv = team ? { ...process.env, PORTAL_MODE: "production" } : process.env;
const brainFile = managedBuild ? path.resolve(process.env.BRAIN_DATA_FILE || path.join(root, team ? ".data/team-brain.json" : ".data/brain.json")) : null;
let brainState = brainFile && fs.existsSync(brainFile) ? JSON.parse(fs.readFileSync(brainFile, "utf8")) : team ? { ...emptyBrain(), businessMode: "uploaded" } : null;
let brainQueue = Promise.resolve();
function saveBrain(next) {
  if (next === brainState) return;
  if (brainFile) {
    fs.mkdirSync(path.dirname(brainFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(`${brainFile}.tmp`, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(`${brainFile}.tmp`, brainFile);
  }
  brainState = next;
}
const localSession = "local-preview-session";
const departmentStore = createDepartmentStore(process.env.DEPARTMENT_STORE_PATH || path.join(root, team ? ".data/team-departments.json" : ".data/departments.json"));
let departmentWrites = 0;
function finishBusinessReset() {
  departmentStore.reset();
  const { resetPending, ...clean } = brainState;
  saveBrain(clean);
}
if (brainState?.resetPending) finishBusinessReset();
const runtimes = runtimeConfig();
const development = process.env.NODE_ENV !== "production";
const privateFiles = ["**/.data/**", ...(brainFile ? [brainFile, `${brainFile}.tmp`] : [])];
const vite = development ? await createViteServer({ root, server: { middlewareMode: true, watch: { ignored: privateFiles }, fs: { deny: ["**/.env*", "**/*.{crt,pem}", "**/.git/**", ...privateFiles] } }, appType: "custom" }) : null;

function json(res, code, value) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
}
async function readJson(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error("Request exceeds the 8 MB pilot limit.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Invalid JSON request."); }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (team) return origin === team.origin || (!origin && req.method === "GET");
  if (!origin) return true;
  try { const listeningPort = server.address()?.port || port; return [`http://127.0.0.1:${listeningPort}`, `http://localhost:${listeningPort}`].includes(new URL(origin).origin); }
  catch { return false; }
}
async function handleApi(req, res, member) {
  if (!sameOrigin(req)) return json(res, 403, { error: "Use the workspace origin." });
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (member && !teamPermits(member, req.method, pathname, brainState?.release)) return json(res, 403, { error: "This account cannot perform that action." });
  if (brainState?.resetPending && pathname !== "/api/brain/reset") return json(res, 503, { error: "Business reset needs to be retried by a developer." });
  if (req.method === "GET" && req.url === "/api/health") return json(res, 200, { ok: true, githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN), mode: team ? "team" : "local-preview" });
  if (req.method === "GET" && req.url === "/api/ceo/dashboard") return json(res, 200, ceoDashboard());
  const dashboardDept = req.url?.match(/^\/api\/ceo\/dashboard\/([a-z0-9-]+)$/);
  if (req.method === "GET" && dashboardDept) {
    const report = ceoDepartment(dashboardDept[1]);
    return json(res, report ? 200 : 404, report || { error: "Unknown department." });
  }
  if (req.url?.startsWith("/api/brain")) {
    const workspaceId = brainState?.workspaceId;
    const body = req.method === "GET" ? {} : await readJson(req);
    if (pathname === "/api/brain/ask-release") return answerReleaseRequest(req, res, body, member);
    if (pathname === "/api/brain/verify-destinations") {
      if (!managedBuild || req.method !== "POST" || !req.headers.origin) return json(res, 403, { error: "Use a development workspace to verify destinations." });
      return json(res, 200, await verifyHandoffDestinations(process.env, { github }));
    }
    const execute = () => req.method !== "GET" && pathname !== "/api/brain/reset" && workspaceId !== brainState?.workspaceId
      ? json(res, 409, { error: "The workspace was reset. Reload before submitting again." })
      : handleWorkspaceBrain(req, res, body, member);
    const pending = brainQueue.then(execute);
    brainQueue = pending.catch(() => undefined);
    return pending;
  }
  if (req.url?.startsWith("/api/departments") || req.url === "/api/runtime/status") {
    const scopedJson = member?.role === "head" && pathname === "/api/departments"
      ? (response, code, value) => json(response, code, { departments: value.departments.filter(({ id }) => id === member.department) })
      : json;
    const readWorkspaceJson = member ? async (request) => {
      const body = await readJson(request);
      if (pathname.endsWith("/review")) return { ...body, reviewer: member.email };
      if (pathname.endsWith("/memory") || pathname.endsWith("/handoffs")) return { ...body, owner: member.email };
      return body;
    } : readJson;
    const resolveEvidence = managedBuild && brainState?.release ? (departmentId, question) => {
      const answer = askRelease(brainState, { area: "bots", departmentId, question });
      return [...new Set(answer.citations?.map(({ document, url }) => `${document} · ${url}`) || [])].join("\n");
    } : undefined;
    const writing = req.method !== "GET";
    if (writing) departmentWrites++;
    try {
      return await handleDepartmentApi(req, res, { store: departmentStore, config: runtimes, readJson: readWorkspaceJson, json: scopedJson, resolveEvidence, canValidate: member?.role === "ceo" || localBuild, actor: member?.email || "Local operator" });
    } finally { if (writing) departmentWrites--; }
  }
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  return handleGithub(req, res, await readJson(req));
}

function teamBrainState(brain, member) {
  const state = publicBrain(member.role === "head" ? emptyBrain() : brain, "customer", {}, brainEnv);
  const release = releaseState(brain, { departmentId: member.department });
  const departments = (brain.release?.departments || []).filter((id) => !member.department || id === member.department);
  const tabs = state.tabs.filter(({ id }) => id === "bots" || (id === "brain" && member.role === "ceo")).map((tab) => ({ ...tab, enabled: true }));
  return {
    ...state,
    tabs,
    departments: departmentGate(brain.confirmed || {}).filter(({ id }) => !member.department || member.department === id),
    workspace: { mode: "team", role: member.role, department: member.department },
    workspaceId: brain.workspaceId || "",
    releaseModel: releaseModel.status,
    documents: [],
    release: { active: release.active && { ...release.active, departments } }
  };
}

async function answerReleaseRequest(req, res, body, member) {
  if (!managedBuild || req.method !== "POST" || !req.headers.origin) {
    return json(res, 403, { error: "This action requires a BusinessBrain workspace." });
  }
  if (member?.role === "head" && (body?.area !== "bots" || body.departmentId !== member.department)) {
    return json(res, 403, { error: "Use your assigned department bot." });
  }
  const snapshot = brainState || emptyBrain();
  const metric = answerBusinessMetric(snapshot, body);
  if (metric) return json(res, 200, metric);
  const baseline = askRelease(snapshot, body || {});
  if (baseline.error) return json(res, 422, baseline);
  const result = await answerFromReleaseModel(releaseModel, baseline, body.question);
  const current = brainState === snapshot ? result : askRelease(brainState || emptyBrain(), body);
  return json(res, current.error ? 422 : 200, current);
}

async function handleWorkspaceBrain(req, res, body, member) {
    const url = new URL(req.url, "http://127.0.0.1");
    if (member && member.role !== "dev" && req.method === "GET" && url.pathname === "/api/brain/state") {
      return json(res, 200, teamBrainState(brainState || emptyBrain(), member));
    }
    if (req.method === "GET" && url.pathname === "/api/brain/ownership-template") {
      const bytes = Buffer.from(await workbookFor(ownershipTemplate()));
      res.writeHead(200, { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="ethikcorp-source-ownership.xlsx"', "X-Content-Type-Options": "nosniff" });
      return res.end(bytes);
    }
    if (req.method === "GET" && url.pathname === "/api/brain/business-template") {
      try {
        const kind = url.searchParams.get("kind");
        const csv = businessTemplate(kind);
        res.writeHead(200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="business-${kind}.csv"`, "Cache-Control": "no-store" });
        return res.end(csv);
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (url.pathname === "/api/brain/reset") {
      if (!managedBuild || req.method !== "POST" || !req.headers.origin) return json(res, 403, { error: "Use the development workspace to reset data." });
      const mode = body?.mode;
      if (body?.confirmation !== "RESET" || !["uploads", "business"].includes(mode)) return json(res, 422, { error: "Enter RESET to confirm." });
      if (!brainState?.resetPending && body.workspaceId !== undefined && body.workspaceId !== (brainState?.workspaceId || "")) return json(res, 409, { error: "The workspace changed. Review it before resetting again." });
      if (mode === "business" && departmentWrites) return json(res, 409, { error: "A department update is running. Retry after it finishes." });
      if (brainState?.resetPending && mode !== "business") return json(res, 409, { error: "Retry the Business reset to finish it." });
      const next = { ...emptyBrain(), businessMode: "uploaded", workspaceId: randomUUID() };
      if (mode === "business") {
        if (!brainState?.resetPending) saveBrain({ ...next, resetPending: true });
        finishBusinessReset();
      } else {
        saveBrain({ ...next, confirmed: brainState?.confirmed || {} });
      }
      return json(res, 200, { ok: true, workspaceId: brainState.workspaceId });
    }
    if (url.pathname === "/api/brain/tables/remove") {
      if (!managedBuild || req.method !== "POST" || !req.headers.origin) return json(res, 403, { error: "Use the development workspace to remove a business table." });
      const tables = { ...brainState?.businessTables };
      const kind = body?.kind;
      if (!Object.hasOwn(tables, kind) || tables[kind].handoffId !== body.handoffId) return json(res, 409, { error: "The uploaded table changed. Reload before removing it." });
      delete tables[kind];
      saveBrain({ ...brainState, businessTables: tables, handoffs: brainState.handoffs.map((file) => file.id === body.handoffId ? { ...file, indexed: false, withdrawnAt: new Date().toISOString() } : file) });
      return json(res, 200, { ok: true });
    }
    if (brainState?.businessMode === "uploaded" && ["/api/brain/demo/plan", "/api/brain/demo/file", "/api/brain/ownership-sample"].includes(url.pathname)) {
      return json(res, 409, { error: "This workspace uses uploaded business data." });
    }
    if (["/api/brain/evaluate", "/api/brain/deploy"].includes(url.pathname)) {
      if (!managedBuild || req.method !== "POST" || !req.headers.origin) return json(res, 403, { error: "This action requires a BusinessBrain workspace." });
      const current = brainState || emptyBrain();
      try {
        const next = url.pathname === "/api/brain/evaluate" ? { ...current, candidate: evaluateCandidate(current) } : deployCandidate(current, { requireGolden: Boolean(team) });
        saveBrain(next);
        return json(res, 200, releaseState(next, { requireGolden: Boolean(team) }));
      } catch (error) { return json(res, 422, { error: error.message }); }
    }
    if (url.pathname === "/api/brain/handoff") {
      if (!managedBuild || req.method !== "POST" || !req.headers.origin) return json(res, 403, { error: "File handoff requires a BusinessBrain workspace." });
      try {
        const result = await stageHandoff(brainState || emptyBrain(), body, process.env, { github });
        saveBrain(result.brain);
        return json(res, 200, result.receipt);
      } catch (error) {
        return json(res, 422, { error: error.message });
      }
    }
    if (url.pathname === "/api/brain/sources/withdraw") {
      if (!managedBuild || req.method !== "POST" || !req.headers.origin) return json(res, 403, { error: "Use the development workspace to withdraw a source." });
      try {
        const next = withdrawSource(brainState || emptyBrain(), body, member?.email || "Local developer");
        saveBrain(next);
        return json(res, 200, sourceInventory(next));
      } catch (error) { return json(res, 422, { error: error.message }); }
    }
    if (url.pathname === "/api/brain/claim") {
      const invite = await readInvite(localSecret, body.invite || "");
      if (!invite) return json(res, 401, { error: "That invite is not valid." });
      body.trustedRole = invite.role;
    }
    const role = managedBuild ? "dev" : brainState?.roles?.[localSession] || "customer";
    const inputBrain = localBuild && brainState && url.pathname === "/api/brain/ask"
      ? { ...brainState, chunks: brainState.chunks.filter((chunk) => !chunk.handoffId) }
      : brainState;
    const stream = url.pathname === "/api/brain/ask" && String(req.headers.accept || "").includes("application/x-ndjson");
    if (stream) {
      res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
      const result = await handleBrain(inputBrain, { method: req.method, pathname: url.pathname, body, role, sessionId: localSession, env: brainEnv, connectors: { github: Boolean(process.env.GITHUB_TOKEN), drive: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) }, onStep: (step) => res.write(`${JSON.stringify({ type: "step", step })}\n`) });
      res.end(`${JSON.stringify({ type: "done", ...result.data })}\n`);
      return;
    }
    const result = await handleBrain(inputBrain, { method: req.method, pathname: url.pathname, body, role, sessionId: localSession, env: brainEnv, connectors: { github: Boolean(process.env.GITHUB_TOKEN), drive: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) } });
    let next = url.pathname === "/api/brain/ask" && brainState ? brainState : result.brain;
    if (managedBuild && next.release && url.pathname === "/api/brain/confirm" && result.status === 200 && result.data.departments.some(({ id }) => id === body.id)) {
      next = { ...next, release: { ...next.release, departments: [...new Set([...next.release.departments, body.id])] } };
    }
    saveBrain(next);
    if (result.signRole) {
      const token = await signInvite(localSecret, result.signRole);
      return json(res, 200, { url: `http://127.0.0.1:${port}/?invite=${token}#dev` });
    }
    const handoff = managedBuild && url.pathname === "/api/brain/state" ? {
      handoff: { connectors: handoffConfig(process.env), receipts: brainState.handoffs || [] },
      sourceInventory: sourceInventory(brainState),
      release: releaseState(brainState, { requireGolden: Boolean(team) }),
      releaseModel: releaseModel.status,
      workspaceId: brainState.workspaceId || "",
      workspace: { mode: team ? "team" : "local", role: "dev" }
    } : {};
    return json(res, result.status, { ...result.data, ...handoff });
}

async function handleGithub(req, res, body) {
  const repo = validateRepo(body.repo);
  if (req.url === "/api/github/test") {
    const data = await github.assertPrivate(repo);
    return json(res, 200, { fullName: data.full_name, branch: repo.branch, private: true });
  }
  if (req.url === "/api/github/save") {
    await github.assertPrivate(repo);
    const clean = cleanPMState(body.state);
    const result = await github.putContent(repo, `${repo.root}/state.json`, Buffer.from(JSON.stringify(clean, null, 2)), "Superbrain PM: update plan metadata");
    return json(res, 200, result);
  }
  if (req.url === "/api/github/load") {
    await github.assertPrivate(repo);
    const item = await github.getContent(repo, `${repo.root}/state.json`);
    if (!item?.content) return json(res, 404, { error: "No saved PM plan found in this repository." });
    return json(res, 200, { state: JSON.parse(Buffer.from(item.content.replace(/\s/g, ""), "base64").toString("utf8")) });
  }
  if (req.url === "/api/github/upload") {
    await github.assertPrivate(repo);
    const file = validateUpload(body);
    const safeName = file.fileName.replace(/[^A-Za-z0-9._-]/g, "-");
    const destination = `${repo.root}/sources/${file.sourceId}/${safeName}`;
    const result = await github.putContent(repo, destination, file.bytes, `Superbrain PM: add approved ${file.sourceId} source`);
    return json(res, 200, { ...result, indexingNote: file.extension === "md" ? "Markdown is ready for a separate GBrain import preview." : "This file still needs reviewed Markdown conversion before GBrain import." });
  }
  return json(res, 404, { error: "Unknown API endpoint." });
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
const server = http.createServer(async (req, res) => {
  try {
    if (localBuild) {
      const boundPort = server.address()?.port;
      if (![`127.0.0.1:${boundPort}`, `localhost:${boundPort}`].includes(req.headers.host)) {
        return json(res, 403, { error: "Use the local workspace address." });
      }
    }
    let member;
    if (team) {
      if (req.headers.host !== team.host) return json(res, 403, { error: "Use the configured team hostname." });
      const identity = await identifyTeamMember(req.headers["cf-access-jwt-assertion"]);
      if (!identity.member) return json(res, identity.status, { error: "Sign in with an approved workspace account." });
      member = identity.member;
      res.setHeader("Cache-Control", "private, no-store");
    }
    if (req.url?.startsWith("/api/")) return await handleApi(req, res, member);
    if (vite) {
      return vite.middlewares(req, res, async () => {
        try {
          const html = await vite.transformIndexHtml(req.url || "/", fs.readFileSync(path.join(root, "index.html"), "utf8"));
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html);
        } catch (error) { vite.ssrFixStacktrace(error); json(res, 500, { error: "Development page failed." }); }
      });
    }
    const requested = decodeURIComponent((req.url || "/").split("?")[0]);
    const file = path.resolve(root, "dist", requested === "/" ? "index.html" : requested.replace(/^\//, ""));
    if (!file.startsWith(path.join(root, "dist") + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: "Not found." });
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    json(res, req.url?.startsWith("/api/departments") || /Invalid|must|required|not configured|exceeds|private|approval/.test(message) ? 400 : 502, { error: message });
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Superbrain PM: http://127.0.0.1:${server.address().port}`));
