import test from "node:test";
import assert from "node:assert/strict";
import { emptyBrain, stageReport } from "../server/brain-pipeline.mjs";
import { demoPlan, ingestDemoFile } from "../server/demo-intake.mjs";
import { publicBrain } from "../server/brain-api.mjs";
import { QUESTIONS, resolveQuestion } from "../server/semantic.mjs";

test("a clean demo ingest accounts for every file, is idempotent, and scores 45 of 45", async () => {
  const plan = await demoPlan();
  assert.equal(plan.drive.detail, "Drive access pending");
  assert.equal(plan.sha.length, 40);
  assert.equal(plan.driveUrl.includes("1sjU5DFEFRSwi1WcJFDz9tPRFwPHouut4"), true);
  let brain = { ...emptyBrain(), demo: { sha: plan.sha, driveIndex: plan.driveIndex, drive: plan.drive, github: plan.github, driveUrl: plan.driveUrl } };
  for (const file of plan.files) {
    const result = await ingestDemoFile(brain, file.path);
    assert.equal(result.ok, true, file.path);
    brain = result.brain;
  }
  const firstDocs = brain.documents.length;
  const firstChunks = brain.chunks.length;
  assert.equal(new Set(brain.documents.map((document) => document.name)).size, firstDocs);
  for (const file of plan.files) {
    const again = await ingestDemoFile(brain, file.path);
    brain = again.brain;
  }
  assert.equal(brain.documents.length, firstDocs);
  assert.equal(brain.chunks.length, firstChunks);
  assert.equal(brain.quality.sha, plan.sha);
  const shifted = { ...brain, demo: { ...brain.demo, sha: "simulated-new-sha" } };
  const sample = plan.files.find((file) => file.path.endsWith(".md"));
  brain = (await ingestDemoFile(shifted, sample.path)).brain;
  assert.equal(brain.quality.sha, "simulated-new-sha");
  assert.equal(brain.documents.length, firstDocs);
  assert.equal(brain.chunks.length, firstChunks);

  const ledger = Object.values(brain.quality.files);
  assert.equal(ledger.length, plan.files.length);
  for (const file of plan.files) {
    const row = brain.quality.files[file.path];
    assert.ok(row, file.path);
    assert.ok(["ingested", "skipped", "failed"].includes(row.status), file.path);
    if (row.status !== "ingested") assert.ok(row.reason, file.path);
  }
  assert.equal(brain.quality.cross.pass, true);
  const byName = Object.fromEntries(brain.quality.cross.checks.map((check) => [check.name, check.actual]));
  assert.equal(byName.revenue_service_lines, 9600000);
  assert.equal(byName.revenue_clients, 9600000);
  assert.equal(byName.closed_won, 6862000);
  assert.equal(byName.open_pipeline_gross, 6505000);
  assert.equal(byName.open_pipeline_weighted, 2397500);
  assert.equal(byName.headcount, 26);
  assert.equal(byName.hours_available, 4160);
  assert.equal(byName.hours_utilized, 3216);
  assert.equal(byName.billable_hours, 1592);
  const cited = [];
  const seen = new Set();
  for (const chunk of brain.chunks) {
    if (!chunk.heading || chunk.document !== chunk.source || !chunk.text.includes(chunk.heading)) continue;
    const key = `${chunk.source}:${chunk.heading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cited.push(chunk);
    if (cited.length === 10) break;
  }
  assert.equal(cited.length, 10);
  for (const chunk of cited) assert.ok(chunk.source.includes("/"));
  let correct = 0;
  for (const item of QUESTIONS) {
    const answer = resolveQuestion(item.question, brain.datasets);
    const refused = /2024|salary|underwater/.test(item.question.toLowerCase());
    assert.equal(answer.refuse, refused, item.question);
    if (!refused) {
      assert.equal(typeof answer.value, "number", item.question);
      assert.ok(answer.provenance?.file, item.question);
    } else assert.match(answer.answer, /will not guess/);
    correct += 1;
  }
  assert.equal(correct, 48);
  assert.equal(QUESTIONS.filter((item) => !/2024|salary|underwater/i.test(item.question)).length, 45);
  const report = stageReport(brain);
  assert.equal(report.percent, 100);
  assert.equal(report.brainReady, true);
  assert.equal(brain.instruction.exported, true);
  assert.equal(brain.instruction.validated, true);
  assert.equal(brain.instruction.pairs, 48);
  assert.equal(brain.instruction.lora, "not_executed");
  const view = publicBrain(brain, "customer", {});
  assert.match(view.finetune.detail, /48-pair dataset exported and validated/);
  assert.match(view.finetune.detail, /LoRA run has not been executed/);
  assert.equal(view.percent, 100);
  assert.equal(view.documents.length, firstDocs);
  assert.equal(view.chunks, firstChunks);
});
