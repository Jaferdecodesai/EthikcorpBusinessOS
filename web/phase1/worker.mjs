import { SOURCES, STEPS, needsYou, ownershipTemplate, parseWorkbook, submitSource, validateOwnership, workbookFor } from "./customer-logic.mjs";
import { d1Repository } from "./repository.mjs";

const STATUSES = new Set(["not_started", "in_progress", "waiting_on_customer", "done"]);

function repoFor(env) {
  return env.REPO || d1Repository(env.DB);
}

function bytesToHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left, right) {
  const a = new TextEncoder().encode(String(left));
  const b = new TextEncoder().encode(String(right));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sign(secret, payload) {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/g, "");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}.${sig}`;
}

async function readSession(request, secret) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("pm_session="))?.slice("pm_session=".length);
  if (!token || !secret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(atob(body));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function cookie(token, secure) {
  return `pm_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200${secure ? "; Secure" : ""}`;
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
}

function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

function snapshotView(snapshot) {
  const steps = STEPS.map((step) => {
    const stored = snapshot.steps.find((item) => item.id === step.id) || { status: "not_started", needsInput: false, summary: step.summary, progress: 0 };
    return { ...step, ...stored, needsYou: needsYou(stored) };
  });
  return {
    sources: SOURCES,
    steps,
    owners: snapshot.owners,
    submissions: snapshot.submissions,
    targets: snapshot.targets,
    attention: steps.filter((step) => step.needsYou).map((step) => step.id)
  };
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const secret = env.SESSION_SECRET || "";
  const secure = url.protocol === "https:";
  if (request.method === "POST" && !sameOrigin(request)) return json({ error: "Cross-origin write rejected." }, 403);
  if (url.pathname === "/enter" && request.method === "GET") {
    const code = url.searchParams.get("code") || "";
    if (!env.ACCESS_CODE || !safeEqual(code, env.ACCESS_CODE)) return json({ error: "That access code is not valid." }, 401);
    const token = await sign(secret, { role: "customer", exp: Date.now() + 12 * 60 * 60 * 1000 });
    return new Response(null, { status: 302, headers: { location: "/#pm", "set-cookie": cookie(token, secure) } });
  }
  if (url.pathname === "/api/login" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const staff = body.role === "staff";
    const expected = staff ? env.STAFF_CODE : env.ACCESS_CODE;
    if (!expected || !safeEqual(body.code || "", expected)) return json({ error: "That access code is not valid." }, 401);
    if (!secret) return json({ error: "SESSION_SECRET is not configured." }, 500);
    const role = staff ? "staff" : "customer";
    const token = await sign(secret, { role, exp: Date.now() + 12 * 60 * 60 * 1000 });
    return json({ role }, 200, { "set-cookie": cookie(token, secure) });
  }
  if (url.pathname === "/api/logout" && request.method === "POST") return json({ ok: true }, 200, { "set-cookie": "pm_session=; HttpOnly; Path=/; Max-Age=0" });
  const session = await readSession(request, secret);
  if (!session) return json({ error: "Sign in required." }, 401);
  const repo = repoFor(env);
  if (url.pathname === "/api/state" && request.method === "GET") return json({ ...snapshotView(await repo.snapshot()), role: session.role });
  if (url.pathname === "/api/ownership.xlsx" && request.method === "GET") {
    const bytes = await workbookFor(ownershipTemplate());
    return new Response(bytes, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": "attachment; filename=\"ethikcorp-source-ownership.xlsx\"" } });
  }
  if (url.pathname === "/api/ownership" && request.method === "POST") {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return json({ error: "Choose the completed .xlsx file." }, 400);
    if (file.size > 2_000_000) return json({ error: "The file is larger than 2 MB." }, 400);
    const parsed = await parseWorkbook(await file.arrayBuffer());
    const result = validateOwnership(parsed);
    if (!result.ok) return json({ ok: false, errors: result.errors }, 422);
    await repo.replaceOwners(result.rows);
    return json({ ok: true, imported: result.rows });
  }
  if (url.pathname === "/api/submissions" && request.method === "POST") {
    const result = submitSource(await request.json().catch(() => ({})));
    if (!result.ok) return json({ error: result.error }, 400);
    await repo.saveSubmission(result.row);
    return json({ ok: true, submission: (await repo.snapshot()).submissions.find((item) => item.sourceId === result.row.sourceId) });
  }
  if (!url.pathname.startsWith("/api/staff")) return json({ error: "Not found." }, 404);
  if (session.role !== "staff") return json({ error: "Staff access is required." }, 403);
  if (url.pathname === "/api/staff/steps" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const current = (await repo.snapshot()).steps.find((step) => step.id === body.id);
    const defined = STEPS.find((step) => step.id === body.id);
    if (!current || !defined) return json({ error: "Unknown step." }, 400);
    const status = STATUSES.has(body.status) ? body.status : current.status;
    let needsInput = typeof body.needsInput === "boolean" ? body.needsInput : current.needsInput;
    if (status === "done") needsInput = false;
    const next = {
      id: current.id,
      status: needsInput ? "waiting_on_customer" : (status === "waiting_on_customer" ? "in_progress" : status),
      needsInput,
      summary: String(body.summary ?? current.summary).slice(0, 500),
      progress: status === "done" ? 100 : Math.max(0, Math.min(100, Math.round(Number(body.progress ?? current.progress) || 0)))
    };
    await repo.saveStep(next);
    return json({ ok: true, step: next });
  }
  if (url.pathname === "/api/staff/targets" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const targets = { github: String(body.github || "").slice(0, 500), drive: String(body.drive || "").slice(0, 500) };
    await repo.saveTargets(targets);
    return json({ ok: true, targets });
  }
  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api") || url.pathname === "/enter") return handleRequest(request, env);
    return env.ASSETS.fetch(request);
  }
};
