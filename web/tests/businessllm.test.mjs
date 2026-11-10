import test from "node:test";
import assert from "node:assert/strict";
import { answerFromChunks, connectorStatus, emptyBrain, ingestDocument, portalAccess } from "../server/brain-pipeline.mjs";
import { readInvite, signInvite } from "../server/invites.mjs";

const secret = "synthetic-test-secret-with-at-least-32-characters";

test("a customer stays gated until the brain and every department are ready", () => {
  const locked = portalAccess("customer", emptyBrain());
  assert.equal(locked.percent, 0);
  assert.equal(locked.tabs.find((tab) => tab.id === "brain").enabled, false);
  assert.equal(locked.tabs.find((tab) => tab.id === "bots").enabled, false);
  assert.equal(locked.tabs[0].id, "pm");
  const ingested = ingestDocument({ ...emptyBrain(), ownershipReady: true }, { name: "handbook.md", text: "The leave policy allows 22 working days. The owner is HR." });
  const built = { ...ingested.brain, confirmed: Object.fromEntries(locked.departments.map((department) => [department.id, true])) };
  const open = portalAccess("customer", built);
  assert.equal(open.brainReady, true);
  assert.equal(open.botsReady, true);
  assert.equal(open.percent, 100);
  assert.deepEqual(open.tabs.map((tab) => tab.id), ["brain", "bots", "pm"]);
});

test("the development role keeps every tab open", () => {
  const view = portalAccess("dev", emptyBrain());
  assert.equal(view.tabs.every((tab) => tab.enabled), true);
  assert.equal(view.tabs[0].id, "pm");
});

test("an uploaded document is chunked, embedded, and answerable with a citation", () => {
  const started = emptyBrain();
  const result = ingestDocument(started, { name: "services.md", text: "Ethikcorp sells leadership programmes and BizScan health checks for UAE teams." });
  assert.equal(result.ok, true);
  assert.ok(result.brain.chunks.length >= 1);
  const answer = answerFromChunks("What does Ethikcorp sell?", result.brain.chunks);
  assert.equal(answer.llm, "not_configured");
  assert.match(answer.answer, /BizScan/);
  assert.equal(answer.citations[0].document, "services.md");
  const refused = ingestDocument(started, { name: "scan.pdf", text: "binary" });
  assert.equal(refused.ok, false);
  assert.match(refused.error, /Docling or Unstructured/);
});

test("github and drive do not report success without credentials", () => {
  const missing = connectorStatus();
  assert.equal(missing.github.ok, false);
  assert.deepEqual(missing.github.missing, ["GITHUB_TOKEN"]);
  assert.equal(missing.drive.ok, false);
  assert.ok(missing.drive.missing.includes("GOOGLE_OAUTH_CLIENT_ID"));
  assert.equal(connectorStatus({ github: true, drive: true }).github.ok, true);
});

test("dev and customer invites are signed with the session secret and expire", async () => {
  const now = Date.now();
  const token = await signInvite(secret, "dev", Math.floor(now / 1000) + 3600, now);
  assert.equal((await readInvite(secret, token, now)).role, "dev");
  assert.equal(await readInvite("another-secret-with-at-least-32-characters", token, now), null);
  assert.equal(await readInvite(secret, token, now + 7200 * 1000), null);
});
