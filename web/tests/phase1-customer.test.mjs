import test from "node:test";
import assert from "node:assert/strict";
import {
  SOURCES,
  STEPS,
  needsYou,
  ownershipTemplate,
  parseWorkbook,
  submitSource,
  validateOwnership,
  workbookFor
} from "../phase1/customer-logic.mjs";

test("the customer catalogue matches the PDF inventory", () => {
  assert.equal(SOURCES.length, 18);
  assert.equal(STEPS.length, 9);
  assert.deepEqual(STEPS.filter((step) => step.customerWork).map((step) => step.id), ["discovery", "collection"]);
  const profile = SOURCES.find((source) => source.id === "profile");
  const hr = SOURCES.find((source) => source.id === "hr");
  const proposals = SOURCES.find((source) => source.id === "proposals");
  const chats = SOURCES.find((source) => source.id === "chats");
  assert.equal(profile.use, "RAG");
  assert.equal(profile.sensitivity, "Public");
  assert.equal(profile.owner, "Marketing");
  assert.equal(proposals.use, "RAG + FT (style)");
  assert.equal(proposals.sensitivity, "Confidential");
  assert.equal(hr.use, "Neither (keep out), except anonymised role profiles");
  assert.equal(hr.sensitivity, "Restricted (sensitive PII)");
  assert.equal(hr.notForAi, true);
  assert.equal(chats.notForAi, true);
  assert.equal(STEPS[3].name, "PII handling (UAE PDPL)");
  assert.equal(STEPS[5].name, "Embeddings + vector DB");
});

test("the ownership workbook round-trips and rejects a broken row", async () => {
  const filled = ownershipTemplate().map((row, index) => ({
    ...row,
    ownerName: `Owner ${index + 1}`,
    dueDate: "2026-12-01",
    authority: index % 2 ? "Context-only" : "Authoritative",
    notForAi: row.notForAi
  }));
  const bytes = await workbookFor(filled);
  const parsed = await parseWorkbook(bytes);
  const result = validateOwnership(parsed);
  assert.equal(result.ok, true);
  assert.equal(result.rows.length, 18);
  assert.equal(result.rows[0].sourceId, "profile");
  assert.equal(result.rows[0].ownerName, "Owner 1");
  assert.equal(result.rows[0].authority, "Authoritative");

  const broken = filled.map((row) => row.sourceId === "policies" ? { ...row, ownerName: "", dueDate: "tomorrow", authority: "maybe", notForAi: "sometimes" } : row);
  const bad = validateOwnership(await parseWorkbook(await workbookFor(broken)));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((error) => error.sourceId === "policies" && /owner name/i.test(error.message)));
  assert.ok(bad.errors.some((error) => /due date/i.test(error.message)));
  assert.ok(bad.errors.some((error) => /authoritative or context-only/i.test(error.message)));
  assert.ok(bad.errors.some((error) => /not for ai/i.test(error.message)));
  assert.equal(bad.rows, undefined);
});

test("an ownership file must contain each source once", async () => {
  const rows = ownershipTemplate().map((row) => ({ ...row, ownerName: "Ada", dueDate: "2026-12-01", authority: "Authoritative" }));
  const missing = rows.filter((row) => row.sourceId !== "legal");
  const missingResult = validateOwnership(await parseWorkbook(await workbookFor(missing)));
  assert.equal(missingResult.ok, false);
  assert.ok(missingResult.errors.some((error) => /legal & registration/i.test(error.message)));

  const duplicate = [...rows, { ...rows[0], ownerName: "Second" }];
  const duplicateResult = validateOwnership(await parseWorkbook(await workbookFor(duplicate)));
  assert.equal(duplicateResult.ok, false);
  assert.ok(duplicateResult.errors.some((error) => /more than once/i.test(error.message)));
});

test("a numeric Excel due date is accepted", async () => {
  const bytes = await workbookFor(ownershipTemplate().map((row) => ({ ...row, ownerName: "Owner", dueDate: 46000, authority: "Authoritative", notForAi: false })));
  const result = validateOwnership(await parseWorkbook(bytes));
  assert.equal(result.ok, true);
  assert.equal(result.rows[0].dueDate, "2025-12-09");
});

test("step 2 submissions accept only a known source and a real target", () => {
  const github = submitSource({ sourceId: "profile", target: "github", note: "https://example.com/profile.md" });
  assert.equal(github.ok, true);
  assert.equal(github.row.target, "github");
  const drive = submitSource({ sourceId: "emails", target: "drive", note: "Folder / decisions" });
  assert.equal(drive.ok, true);
  const excluded = submitSource({ sourceId: "hr", target: "not_applicable", note: "Payroll stays in the HR system." });
  assert.equal(excluded.ok, true);
  assert.equal(submitSource({ sourceId: "missing", target: "github", note: "" }).ok, false);
  assert.match(submitSource({ sourceId: "profile", target: "email", note: "" }).error, /GitHub, Google Drive, or not applicable/);
});

test("the red marker follows the stored flag and clears when a step is done", () => {
  assert.equal(needsYou({ status: "waiting_on_customer", needsInput: true }), true);
  assert.equal(needsYou({ status: "in_progress", needsInput: false }), false);
  assert.equal(needsYou({ status: "done", needsInput: true }), false);
});
