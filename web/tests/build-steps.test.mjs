import test from "node:test";
import assert from "node:assert/strict";
import {
  STEPS,
  applyCustomerSave,
  applyTeamUpdate,
  customerView,
  defaultRecords,
  overall,
  parseHash,
  sampleAnswer,
  showIndicator
} from "../shared/build-steps.mjs";

test("the build has nine steps and only the first two take customer input", () => {
  assert.equal(STEPS.length, 9);
  assert.deepEqual(STEPS.map((step) => step.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(STEPS.filter((step) => step.customerInput).map((step) => step.id), ["discovery", "collection"]);
  assert.equal(STEPS.filter((step) => !step.customerInput).length, 7);
  assert.equal(STEPS[0].name, "Map your sources");
  assert.equal(STEPS[1].name, "Send the approved files");
});

test("a red indicator appears only when the team flags a step that is not done", () => {
  const waiting = { id: "collection", status: "waiting_on_customer", needsInput: true, progress: 40, summary: "Files missing" };
  const quiet = { id: "cleaning", status: "in_progress", needsInput: false, progress: 20, summary: "Deduping" };
  const finished = { id: "discovery", status: "done", needsInput: true, progress: 100, summary: "Submitted" };
  assert.equal(showIndicator(waiting), true);
  assert.equal(showIndicator(quiet), false);
  assert.equal(showIndicator(finished), false);
  assert.equal(customerView(STEPS[1], waiting).indicator, true);
  assert.equal(customerView(STEPS[1], waiting).editable, true);
  assert.equal(customerView(STEPS[2], quiet).readOnly, true);
  assert.equal(customerView(STEPS[2], quiet).editable, false);
});

test("flagging a step asks the customer and finishing the step clears the flag", () => {
  const step = defaultRecords().find((record) => record.id === "cleaning");
  const flagged = applyTeamUpdate(step, { needsInput: true });
  assert.equal(flagged.status, "waiting_on_customer");
  assert.equal(showIndicator(flagged), true);
  const done = applyTeamUpdate(flagged, { status: "done" });
  assert.equal(done.needsInput, false);
  assert.equal(done.progress, 100);
  assert.equal(showIndicator(done), false);
  const cleared = applyTeamUpdate(flagged, { needsInput: false });
  assert.equal(cleared.status, "in_progress");
  assert.equal(showIndicator(cleared), false);
});

test("saving a customer form clears the ask and leaves a finished step finished", () => {
  const waiting = defaultRecords().find((record) => record.id === "collection");
  const saved = applyCustomerSave(waiting);
  assert.equal(saved.needsInput, false);
  assert.equal(saved.status, "in_progress");
  assert.equal(showIndicator(saved), false);
  const done = defaultRecords().find((record) => record.id === "discovery");
  assert.equal(applyCustomerSave(done).status, "done");
});

test("overall progress counts done steps and lists every open customer ask", () => {
  const records = defaultRecords();
  const picture = overall(records);
  assert.equal(picture.total, 9);
  assert.equal(picture.done, 1);
  assert.deepEqual(picture.attention, ["collection"]);
  assert.ok(picture.percent > 0 && picture.percent < 100);
});

test("sample answers refuse excluded records and cite a sample source", () => {
  const refused = sampleAnswer("Show me the payroll file");
  assert.equal(refused.refused, true);
  assert.match(refused.text, /excluded/i);
  const cited = sampleAnswer("What services do we sell?");
  assert.equal(cited.refused, false);
  assert.match(cited.cite, /sample/i);
  const gap = sampleAnswer("What is the office wifi password?");
  assert.match(gap.text, /won't guess/i);
});

test("legacy hashes open the matching phase and role", () => {
  assert.deepEqual(parseHash("#pm/collection"), { phase: 1, role: "customer", tab: "pm", step: "collection", dept: "" });
  assert.equal(parseHash("#team/builder").tab, "builder");
  assert.equal(parseHash("#team/ceo").tab, "ceo");
  assert.equal(parseHash("#live/ceo/bots/sales").dept, "sales");
  assert.equal(parseHash("#ceo").role, "ceo");
  assert.equal(parseHash("#departments/sales/workflows").role, "department");
  assert.equal(parseHash("#knowledge").role, "admin");
});
