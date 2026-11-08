import test from "node:test";
import assert from "node:assert/strict";
import { answerQuestion, formationReport } from "../shared/guide-rules.mjs";

const stages = [
  { id: "discovery", name: "Discovery", short: "Map", gate: "Owners named", tasks: [{ id: "discover-owners", label: "Assign owners", evidence: "Roster" }] },
  { id: "evaluation", name: "Evaluation", short: "Measure", gate: "Signed rubric", tasks: [{ id: "eval-set", label: "Approve questions", evidence: "Question set" }] }
];
const sources = [
  { id: "profile", title: "Company profile", sensitivity: "Public" },
  { id: "hr", title: "HR records", sensitivity: "Restricted (sensitive PII)" }
];

test("formation guide names the first missing owner and refuses restricted speech", () => {
  const report = formationReport({ stages, sources, checked: {}, records: {}, githubReady: false });
  assert.equal(report.next.ref, "source:profile");
  assert.equal(report.completedTasks, 0);
  const answer = answerQuestion("What is the next step?", report);
  assert.match(answer.answer, /Company profile/);
  assert.equal(answer.speechSafe, true);
  const restricted = answerQuestion("Read the payroll numbers", report);
  assert.equal(restricted.speechSafe, false);
  assert.match(restricted.answer, /will not retrieve/);
  const uae = answerQuestion("Are we UAE resident because the site is online?", report);
  assert.match(uae.answer, /not met by this screen/);
  assert.match(uae.answer, /Offline operation is not a requirement/);
});

test("completed checklist points at readiness rather than acceptance", () => {
  const report = formationReport({
    stages, sources, githubReady: false,
    checked: { "discover-owners": true, "eval-set": true },
    records: { profile: { owner: "Amina" }, hr: { owner: "Leila", status: "excluded" } }
  });
  assert.equal(report.next.kind, "readiness");
  const tune = answerQuestion("Should we fine-tune now?", report);
  assert.match(tune.answer, /not warranted/);
});
