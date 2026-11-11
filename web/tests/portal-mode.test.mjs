import test from "node:test";
import assert from "node:assert/strict";
import { handleBrain } from "../server/brain-api.mjs";
import { emptyBrain } from "../server/brain-pipeline.mjs";
import { ownershipTemplate, workbookFor } from "../phase1/customer-logic.mjs";

const customer = { PORTAL_MODE: "customer" };
const team = { PORTAL_MODE: "aqionteam" };

test("customer mode stays locked before Step 1 and never returns the dev view", async () => {
  const state = await handleBrain(emptyBrain(), { method: "GET", pathname: "/api/brain/state", body: {}, role: "dev", sessionId: "s", env: customer, connectors: {} });
  assert.equal(state.data.role, "customer");
  assert.equal(state.data.ownershipReady, false);
  assert.equal(state.data.tabs.find((tab) => tab.id === "brain").enabled, false);
  assert.equal(state.data.tabs.find((tab) => tab.id === "bots").enabled, false);
  assert.equal(state.data.tabs[0].id, "pm");
  assert.equal(state.data.tabs.find((tab) => tab.id === "pm").label, "BusinessBrain PM");
  for (const path of ["/api/brain/bootstrap-dev", "/api/brain/demo/plan", "/api/brain/demo/file", "/api/brain/documents", "/api/brain/confirm", "/api/brain/ownership-sample"]) {
    const denied = await handleBrain(emptyBrain(), { method: "POST", pathname: path, body: { trustedRole: "dev" }, role: "dev", sessionId: "s", env: customer, connectors: {} });
    assert.equal(denied.status, 403, path);
    assert.notEqual(denied.data.role, "dev");
  }
  const claim = await handleBrain(emptyBrain(), { method: "POST", pathname: "/api/brain/claim", body: { trustedRole: "dev" }, role: "customer", sessionId: "s", env: customer, connectors: {} });
  assert.equal(claim.status, 403);
});

test("a valid Step 1 workbook unlocks the customer portal and an invalid workbook does not", async () => {
  const bytes = await workbookFor(ownershipTemplate().map((row) => ({ ...row, ownerName: "Ada", dueDate: "2026-12-01", authority: "Authoritative" })));
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (String(url).includes("git/trees")) return { ok: true, json: async () => ({ tree: [{ type: "blob", path: "README.md", size: 20, sha: "a" }] }) };
    if (String(url).includes("commits/main")) return { ok: true, json: async () => ({ sha: "abc" }) };
    if (String(url).includes("drive-manifest")) return { ok: false, json: async () => ({ files: [] }) };
    return { ok: true, text: async () => "# Ethikcorp\n\nLeadership programmes.\n", headers: { get: () => "" } };
  };
  const opened = await handleBrain(emptyBrain(), { method: "POST", pathname: "/api/brain/ownership", body: { xlsxBase64: Buffer.from(bytes).toString("base64") }, role: "customer", sessionId: "s", env: customer, connectors: {}, fetchImpl });
  assert.equal(opened.status, 200);
  assert.equal(opened.data.role, "customer");
  assert.equal(opened.data.ownershipReady, true);
  assert.equal(opened.data.tabs.find((tab) => tab.id === "brain").enabled, true);
  assert.equal(opened.data.tabs.find((tab) => tab.id === "bots").enabled, true);
  assert.ok(calls.some((url) => url.includes("git/trees")));
  assert.ok((opened.brain.documents || []).length >= 1);

  let built = false;
  const invalid = await handleBrain(emptyBrain(), { method: "POST", pathname: "/api/brain/ownership", body: { rows: [{ sourceId: "profile", department: "Marketing", ownerName: "Ada", dueDate: "2026-12-01", authority: "Authoritative", notForAi: "No" }] }, role: "customer", sessionId: "s", env: customer, connectors: {}, fetchImpl: async () => { built = true; throw new Error("must not build"); } });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.brain.ownershipReady || false, false);
  assert.equal(built, false);
  const still = await handleBrain(invalid.brain, { method: "GET", pathname: "/api/brain/state", body: {}, role: "dev", sessionId: "s", env: customer, connectors: {} });
  assert.equal(still.data.role, "customer");
  assert.equal(still.data.tabs.find((tab) => tab.id === "brain").enabled, false);
  assert.equal(still.data.tabs.find((tab) => tab.id === "bots").enabled, false);
});

test("the Aqion team portal accepts the demo ownership sample and stays closed without a dev session", async () => {
  const closed = await handleBrain(emptyBrain(), { method: "GET", pathname: "/api/brain/state", body: {}, role: "customer", sessionId: "s", env: team, connectors: {} });
  assert.equal(closed.status, 401);
  const sample = await handleBrain(emptyBrain(), { method: "POST", pathname: "/api/brain/ownership-sample", body: {}, role: "dev", sessionId: "s", env: team, connectors: {} });
  assert.equal(sample.status, 200);
  assert.equal(sample.data.ownershipReady, true);
  assert.equal(sample.data.role, "dev");
  assert.equal(sample.data.tabs.every((tab) => tab.enabled), true);
  assert.equal(sample.data.tabs.find((tab) => tab.id === "pm").label, "BusinessBrain PM");
});
