import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { ingestDocument, emptyBrain } from "../server/brain-pipeline.mjs";
import { deployCandidate, evaluateCandidate } from "../server/brain-release.mjs";

test("signed team roles protect the build and scope department retrieval and review", async (t) => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const dir = mkdtempSync(path.join(tmpdir(), "businessos-team-"));
  const issuer = "https://synthetic.cloudflareaccess.com";
  const audience = "team-businessos";
  const host = "businessos.example.test";
  const origin = `https://${host}`;
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const jwk = { ...await exportJWK(publicKey), kid: "qa", alg: "RS256", use: "sig" };
  const hook = path.join(dir, "jwks.mjs");
  writeFileSync(hook, `
    const upstream = globalThis.fetch;
    globalThis.fetch = async (url, ...args) => {
      if (String(url) === ${JSON.stringify(issuer + "/cdn-cgi/access/certs")}) return Response.json(${JSON.stringify({ keys: [jwk] })});
      if (String(url) !== "https://qa.openai.azure.com/openai/v1/chat/completions") return upstream(url, ...args);
      const payload = JSON.parse(JSON.parse(args[0].body).messages[1].content);
      if (payload.passages.length !== 1 || !payload.passages[0].text.includes("Ambergris")) return new Response(null, { status: 422 });
      const points = [{ statement: "Ambergris approval applies to the synthetic shipments.", source: 1, evidence: payload.passages[0].text }];
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({ points }) } }] });
    };
  `);

  const seed = { ...emptyBrain(), confirmed: { sales: true, finance: true }, ownershipReady: true, ownership: [{ sourceId: "sops", notForAi: false }] };
  const { brain } = ingestDocument(seed, { name: "approved-sales.md", text: "Ambergris approval for synthetic shipments.", sourceId: "sops", audience: "sales", handoffId: "synthetic", sourceUrl: "https://github.com/example/intake/blob/qa/approved-sales.md" });
  const deployed = deployCandidate({ ...brain, candidate: evaluateCandidate(brain) });
  const brainFile = path.join(dir, "brain.json");
  writeFileSync(brainFile, JSON.stringify(deployed));
  const env = {
    ...process.env, NODE_ENV: "production", PORT: "0", PORTAL_MODE: "production",
    BRAIN_LOCAL_DEVELOPMENT: "false", BRAIN_TEAM_ORIGIN: origin, BRAIN_ACCESS_ISSUER: issuer,
    BRAIN_ACCESS_AUDIENCE: audience, BRAIN_DATA_FILE: brainFile, DEPARTMENT_STORE_PATH: path.join(dir, "departments.json"),
    BRAIN_TEAM_ROSTER: JSON.stringify({ "dev@example.test": { role: "dev" }, "ceo@example.test": { role: "ceo" }, "sales@example.test": { role: "head", department: "sales" }, "finance@example.test": { role: "head", department: "finance" } }),
    NODE_OPTIONS: `--import=${hook}`, RUNTIME_EGRESS_APPROVED: "false",
    BRAIN_MODEL_EGRESS_APPROVED: "true", AZURE_OPENAI_ENDPOINT: "https://qa.openai.azure.com",
    AZURE_OPENAI_KEY: "test-only", AZURE_OPENAI_DEPLOYMENT: "qa-model"
  };
  const child = spawn(process.execPath, ["server/index.mjs"], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  t.after(async () => {
    if (child.exitCode === null) { child.kill(); await new Promise((resolve) => child.once("exit", resolve)); }
    rmSync(dir, { recursive: true, force: true });
  });
  const base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("The team origin did not start.")), 10000);
    child.stdout.on("data", (chunk) => {
      const address = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (address) { clearTimeout(timeout); resolve(address); }
    });
    child.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Team origin exited (${code}).`)); });
  });
  const sign = (email, aud = audience, expires = "5m") => new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256", kid: "qa" }).setSubject(email).setIssuer(issuer).setAudience(aud).setExpirationTime(expires).sign(privateKey);
  const [dev, ceo, sales, finance, other, badAudience, expired] = await Promise.all([
    sign("dev@example.test"), sign("ceo@example.test"), sign("sales@example.test"), sign("finance@example.test"),
    sign("other@example.test"), sign("sales@example.test", "other"), sign("sales@example.test", audience, 1)
  ]);
  async function request(route, token, body, overrides = {}) {
    return new Promise((resolve, reject) => {
      const outgoing = httpRequest(base + route, {
        method: body === undefined ? "GET" : "POST",
        headers: { Host: host, ...(token ? { "Cf-Access-Jwt-Assertion": token } : {}), ...(body ? { Origin: origin, "Content-Type": "application/json" } : {}), ...overrides }
      }, (response) => {
        let data = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => { data += chunk; });
        response.on("end", () => {
          try { resolve({ status: response.statusCode, data: JSON.parse(data) }); }
          catch (error) { reject(error); }
        });
      });
      outgoing.on("error", reject);
      outgoing.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
  assert.equal((await request("/api/brain/state")).status, 401);
  assert.equal((await request("/api/brain/state", badAudience)).status, 401);
  assert.equal((await request("/api/brain/state", expired)).status, 401);
  const [header, claims, signature] = sales.split(".");
  const tampered = `${header}.${claims}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
  assert.equal((await request("/api/brain/state", tampered)).status, 401);
  assert.equal((await request("/api/brain/state", other)).status, 403);
  assert.equal((await request("/api/brain/state", sales, undefined, { Host: "other.example.test" })).status, 403);
  const state = (await request("/api/brain/state", sales)).data;
  assert.deepEqual(state.tabs.map(({ id }) => id), ["bots"]);
  assert.deepEqual(state.departments.map(({ id }) => id), ["sales"]);
  assert.deepEqual(state.release.active.departments, ["sales"]);
  assert.equal(state.handoff, undefined);
  assert.equal(state.documents.length, 0);
  assert.deepEqual((await request("/api/brain/state", ceo)).data.tabs.map(({ id }) => id).sort(), ["bots", "brain"]);
  assert.ok((await request("/api/brain/state", dev)).data.handoff);
  assert.equal((await request("/api/brain/deploy", sales, {})).status, 403);
  assert.equal((await request("/api/brain/verify-destinations", sales, {})).status, 403);
  assert.equal((await request("/api/brain/bootstrap-dev", dev, {})).status, 403);
  assert.equal((await request("/api/brain/deploy", dev, {}, { Origin: "https://other.example.test" })).status, 403);
  assert.equal((await request("/api/departments/finance", sales)).status, 403);
  assert.equal((await request("/api/departments/sales//messages", sales, { text: "Unexpected path" })).status, 403);
  assert.equal((await request("/api/departments/sales/tasks", ceo, { title: "CEO assigned follow-up", owner: "Sales lead", dueDate: "2026-12-01" })).status, 201);
  assert.equal((await request("/api/departments/sales/tasks", sales, { title: "Synthetic follow-up" })).status, 201);
  const ask = (token, departmentId, area = "bots") => request("/api/brain/ask-release", token, { area, departmentId, question: "ambergris" });
  assert.equal((await ask(sales, "finance")).status, 403);
  assert.equal((await ask(sales, "sales", "brain")).status, 403);
  const salesAnswer = (await ask(sales, "sales")).data;
  assert.match(salesAnswer.answer, /Ambergris.*\[1\]/);
  assert.equal(salesAnswer.llm, "azure-release");
  const financeAnswer = (await ask(finance, "finance")).data;
  assert.equal(financeAnswer.refused, true);
  assert.equal(financeAnswer.llm, "extractive");
  assert.match((await ask(ceo, undefined, "brain")).data.answer, /Ambergris/);
  const draft = await request("/api/departments/sales/runs", sales, { workflowId: "sales-proposal", objective: "Draft ambergris follow-up." });
  assert.equal(draft.status, 201);
  const run = draft.data.runs[0];
  assert.match(run.output, /BusinessBrain citations\n.*approved-sales\.md/);
  const review = await request(`/api/departments/sales/runs/${run.id}/review`, sales, { decision: "approve", reviewer: "forged@example.test", note: "Checked synthetic source.", outputHash: run.outputHash });
  assert.equal(review.status, 200);
  assert.equal(review.data.runs[0].review.reviewer, "sales@example.test");
  const proposed = await request("/api/departments/sales/automations", sales, { name: "Renewal check", trigger: "Renewal request", steps: "Check approved terms\nPrepare a renewal brief" });
  assert.equal(proposed.status, 201);
  const automationPath = `/api/departments/sales/automations/${proposed.data.id}/review`;
  const validation = { decision: "approve", note: "Validated.", hash: proposed.data.hash, reviewer: "fake@example.test" };
  assert.equal((await request(automationPath, sales, validation)).status, 403);
  assert.equal((await request("/api/departments/sales/runs", sales, { workflowId: proposed.data.id, objective: "Prepare a renewal." })).status, 400);
  const approved = await request(automationPath, ceo, validation);
  assert.equal(approved.status, 200);
  assert.equal(approved.data.automations[0].review.reviewer, "ceo@example.test");
  const customRun = await request("/api/departments/sales/runs", sales, { workflowId: proposed.data.id, objective: "Prepare a renewal." });
  assert.equal(customRun.status, 201);
  assert.match(customRun.data.runs[0].output, /Check approved terms/);

  const withdrawal = { documentId: brain.documents[0].id, reason: "Synthetic source owner withdrew approval." };
  assert.equal((await request("/api/brain/sources/withdraw", sales, withdrawal)).status, 403);
  const removed = await request("/api/brain/sources/withdraw", dev, withdrawal);
  assert.equal(removed.status, 200);
  assert.equal(removed.data.withdrawals[0].actor, "dev@example.test");
  const after = (await request("/api/brain/state", sales)).data;
  assert.equal(after.release.active.documents, 0);
  assert.notEqual(after.release.active.contentVersion, state.release.active.contentVersion);
  assert.equal(after.sourceInventory, undefined);
  assert.equal((await ask(sales, "sales")).data.refused, true);
  const reset = { confirmation: "RESET", mode: "uploads", workspaceId: "" };
  assert.equal((await request("/api/brain/reset", ceo, reset)).status, 403);
  const cleared = await request("/api/brain/reset", dev, reset);
  assert.equal(cleared.status, 200);
  const preserved = await request("/api/departments/sales", ceo);
  assert.equal(preserved.data.tasks.length, 2);
  assert.equal(preserved.data.automations.length, 1);
  assert.equal((await request("/api/brain/reset", dev, { ...reset, mode: "business" })).status, 409);
  const all = await request("/api/brain/reset", dev, { ...reset, mode: "business", workspaceId: cleared.data.workspaceId });
  assert.equal(all.status, 200);
  const clean = (await request("/api/brain/state", dev)).data;
  assert.equal(clean.businessMode, "uploaded");
  assert.equal(clean.release.active, null);
  assert.equal(clean.departments.some(({ confirmed }) => confirmed), false);
  assert.equal(clean.ownershipReady, false);
  assert.equal(clean.datasets.length, 0);
  const cleanDept = (await request("/api/departments/sales", ceo)).data;
  assert.equal(cleanDept.tasks.length + cleanDept.automations.length + cleanDept.runs.length, 0);
});
