import test from "node:test";
import assert from "node:assert/strict";
import { emptyBrain } from "../server/brain-pipeline.mjs";
import { askRelease, deployCandidate, evaluateCandidate, releaseState, sourceInventory } from "../server/brain-release.mjs";
import { withdrawSource } from "../server/source-lifecycle.mjs";
import { stageHandoff, verifyHandoffDestinations } from "../server/stage-handoff.mjs";
import { workbookFor } from "../phase1/customer-logic.mjs";
import { demoOwnershipRows, publicBrain } from "../server/brain-api.mjs";
import { answerBusinessMetric } from "../server/business-intake.mjs";
import { buildOverview } from "../server/datasets.mjs";

const env = {
  GITHUB_TOKEN: "synthetic",
  BRAIN_GITHUB_REPOSITORY: "test/private-intake",
  BRAIN_DRIVE_FOLDER_ID: "test_folder",
  GOOGLE_OAUTH_CLIENT_ID: "synthetic",
  GOOGLE_OAUTH_CLIENT_SECRET: "synthetic",
  GOOGLE_OAUTH_REFRESH_TOKEN: "synthetic"
};

test("destination verification checks privacy and access without creating files", async () => {
  const calls = [];
  const result = await verifyHandoffDestinations(env, {
    github: { assertPrivate: async () => ({ archived: true }) },
    fetcher: async (url, init) => {
      calls.push([url, init.method || "GET"]);
      if (url.includes("oauth2.")) return Response.json({ access_token: "synthetic" });
      if (url.includes("/permissions")) return Response.json({ permissions: [{ type: "domain" }] });
      return Response.json({ mimeType: "application/vnd.google-apps.folder", capabilities: { canAddChildren: true } });
    }
  });
  assert.equal(result.github.status, "failed");
  assert.match(result.github.detail, /does not accept writes/);
  assert.equal(result.drive.status, "failed");
  assert.match(result.drive.detail, /approved people or groups/);
  assert.deepEqual(calls.map(([url, method]) => [new URL(url).hostname, method]), [
    ["oauth2.googleapis.com", "POST"], ["www.googleapis.com", "GET"], ["www.googleapis.com", "GET"]
  ]);
});

test("dual handoff validates the workbook, retries a failed destination and indexes once", async () => {
  let githubWrites = 0;
  let driveWrites = 0;
  let failDrive = false;
  const github = {
    assertPrivate: async () => {},
    getContent: async () => null,
    putContent: async (_repo, path) => { githubWrites++; return { path, commit: "synthetic" }; }
  };
  const fetcher = async (url, init) => {
    const parsed = new URL(url);
    if (parsed.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "synthetic" });
    if (parsed.pathname.endsWith("/permissions")) return Response.json({ permissions: [{ type: "user" }] });
    if (parsed.pathname.endsWith("/test_folder")) return Response.json({ mimeType: "application/vnd.google-apps.folder", capabilities: { canAddChildren: true } });
    if (init.method === "POST") {
      driveWrites++;
      assert.match(init.headers["Content-Type"], /^multipart\/related; boundary=/);
      return failDrive ? Response.json({}, { status: 503 }) : Response.json({ id: `test_${driveWrites}` });
    }
    return Response.json({ files: [] });
  };
  const context = { github, fetcher };
  const base = { approved: true, approvalRef: "SYNTHETIC-QA" };
  const intake = { ...base, stage: "intake", sourceId: "sops", audience: "sales", fileName: "routing.md", base64: Buffer.from("# Amber routing\n\nThe monorail approval code is ambergris.").toString("base64") };
  await assert.rejects(stageHandoff(emptyBrain(), intake, env, context), /ownership workbook/);
  const workbook = await workbookFor(demoOwnershipRows());
  const ownership = await stageHandoff(emptyBrain(), { ...base, stage: "ownership", fileName: "ownership.xlsx", base64: Buffer.from(workbook).toString("base64") }, env, context);
  assert.equal(ownership.brain.ownershipReady, true);
  assert.equal(ownership.brain.documents.length, 0);
  const revenue = { ...base, stage: "intake", tableKind: "revenue", fileName: "revenue.csv", base64: Buffer.from("month,service_line,revenue_aed\n2026-09,Consulting,12000\n2026-10,Consulting,16000").toString("base64") };
  await assert.rejects(stageHandoff(ownership.brain, { ...revenue, base64: Buffer.from("month,service_line,revenue_aed\n2026-15,Consulting,12000").toString("base64") }, env, context), /invalid month/);
  failDrive = true;
  const partial = await stageHandoff(ownership.brain, intake, env, context);
  assert.equal(partial.receipt.destinations.github.status, "uploaded");
  assert.equal(partial.receipt.destinations.drive.status, "failed");
  assert.equal(partial.brain.documents.length, 0);
  failDrive = false;
  const complete = await stageHandoff(partial.brain, intake, env, context);
  const duplicate = await stageHandoff(complete.brain, intake, env, context);
  assert.equal(githubWrites, 2);
  assert.equal(driveWrites, 3);
  assert.equal(duplicate.brain.documents.length, 1);
  assert.equal(duplicate.receipt.indexed, true);
  await assert.rejects(stageHandoff(complete.brain, { ...intake, sourceId: "hr" }, env, context), /approved for this pilot/);
  const ready = { ...duplicate.brain, confirmed: { sales: true, finance: true } };
  assert.throws(() => deployCandidate(ready), /retrieval checks/);
  const evaluated = { ...ready, candidate: evaluateCandidate(ready) };
  assert.equal(releaseState(evaluated).canDeploy, true);
  const deployed = deployCandidate(evaluated);
  assert.deepEqual(deployed.release.departments, ["sales", "finance"]);
  const sales = askRelease(deployed, { area: "bots", departmentId: "sales", question: "ambergris" });
  assert.match(sales.answer, /ambergris/);
  assert.match(sales.citations[0].url, /^https:\/\/github\.com\//);
  const salesQuestion = (question) => askRelease(deployed, { area: "bots", departmentId: "sales", question });
  assert.match(salesQuestion("What is the monorail approval code?").answer, /ambergris/);
  assert.deepEqual(salesQuestion("What is the vacation approval deadline?").citations, []);
  assert.equal(salesQuestion("What is it?").refused, true);
  const finance = askRelease(deployed, { area: "bots", departmentId: "finance", question: "ambergris" });
  assert.equal(finance.refused, true);
  assert.equal(finance.citations.length, 0);
  const withdrawn = { ...deployed, ownership: deployed.ownership.map((row) => row.sourceId === "sops" ? { ...row, notForAi: true } : row) };
  assert.equal(askRelease(withdrawn, { question: "ambergris" }).refused, true);
  assert.equal(releaseState(withdrawn).canDeploy, false);

  assert.throws(() => deployCandidate(evaluated, { requireGolden: true }), /validation cases/);
  const rows = [
    { question: "ambergris", expectedDocument: "routing.md", department: "sales", split: "calibration" },
    { question: "monorail", expectedDocument: "routing.md", department: "sales" },
    { question: "ambergris", expectedDocument: null, department: "finance" }
  ];
  const uploadCases = (brain, cases) => stageHandoff(brain, {
    ...base, stage: "evaluation", fileName: "golden.jsonl",
    base64: Buffer.from(cases.map((row) => JSON.stringify(row)).join("\n")).toString("base64")
  }, env, context);
  const { brain: withCases } = await uploadCases(deployed, rows);
  await assert.rejects(uploadCases(deployed, [rows[0], { ...rows[0], question: "What is ambergris?", split: "validation" }]), /distinct calibration and validation/);
  assert.equal(releaseState(withCases, { requireGolden: true }).canDeploy, false);
  const withEvaluation = { ...withCases, candidate: evaluateCandidate(withCases) };
  assert.equal(withEvaluation.candidate.calibrationCases, 1);
  assert.deepEqual(withEvaluation.candidate.validationChecks.map((check) => check.passed), [true, true]);
  assert.equal(releaseState(withEvaluation, { requireGolden: true }).canDeploy, true);
  assert.equal(deployCandidate(withEvaluation, { requireGolden: true }).release.profile, withEvaluation.candidate.profile);
  const { brain: wrongScope } = await uploadCases(withCases, [rows[0], { ...rows[2], expectedDocument: "routing.md" }]);
  assert.equal(evaluateCandidate(wrongScope).passed, false);

  const published = deployCandidate(withEvaluation, { requireGolden: true });
  const { brain: staged } = await stageHandoff(published, {
    ...intake, base64: Buffer.from("The monorail approval code is cobalt.").toString("base64")
  }, env, context);
  const entry = sourceInventory(staged).sources[0];
  assert.equal(entry.revisions, 2);
  assert.equal(entry.serving, true);
  assert.equal(entry.current, false);
  const purged = withdrawSource(staged, { documentId: entry.id, reason: "Source owner withdrew approval" }, "qa@example.test");
  assert.equal(purged.documents.length, 0);
  assert.equal(purged.chunks.length, 0);
  assert.equal(sourceInventory(purged).withdrawals[0].actor, "qa@example.test");
  assert.equal(purged.handoffs.filter((file) => file.stage === "intake" && file.withdrawnAt && file.destinations.github.url).length, 2);
  assert.equal(askRelease(purged, { area: "bots", departmentId: "sales", question: "ambergris" }).refused, true);
  assert.equal(releaseState(purged).active.documents, 0);
  assert.notEqual(releaseState(published).active.contentVersion, releaseState(purged).active.contentVersion);
  await assert.rejects(stageHandoff(purged, { ...intake, audience: "company" }, env, context), /new owner approval reference/);
  const approvedAgain = { ...intake, approvalRef: "QA-REAPPROVED" };
  failDrive = true;
  const restoring = await stageHandoff(purged, approvedAgain, env, context);
  assert.equal(restoring.receipt.restoring, true);
  assert.equal(restoring.brain.documents.length, 0);
  failDrive = false;
  const restored = await stageHandoff(restoring.brain, approvedAgain, env, context);
  assert.equal(restored.receipt.indexed, true);
  assert.equal(restored.receipt.withdrawnAt, undefined);
  assert.equal(askRelease(restored.brain, { question: "ambergris" }).refused, true);
  const redeployed = deployCandidate({ ...restored.brain, candidate: evaluateCandidate(restored.brain) }, { requireGolden: true });
  assert.match(askRelease(redeployed, { area: "bots", departmentId: "sales", question: "ambergris" }).answer, /ambergris/);
  assert.equal(askRelease(redeployed, { area: "bots", departmentId: "finance", question: "ambergris" }).refused, true);

  const { brain: reporting } = await stageHandoff({ ...redeployed, datasets: { pipeline: { rows: [{ stage: "Closed Won" }], sample: true } } }, revenue, env, context);
  const projection = publicBrain(reporting, "dev", {});
  assert.equal(projection.businessMode, "uploaded");
  assert.deepEqual(projection.datasets.map(({ id, rows, sample }) => [id, rows, sample]), [["revenue", 2, false]]);
  assert.equal(reporting.documents.length, redeployed.documents.length);
  const dashboard = buildOverview(projection.model);
  assert.equal(dashboard.kpis[0].value, 28000);
  assert.equal(dashboard.kpis.find(({ id }) => id === "pipeline").value, null);
  assert.equal(dashboard.charts.every(({ sample }) => !sample), true);
  assert.equal(answerBusinessMetric(reporting, { area: "bots", question: "Total revenue" }), null);
  assert.match(answerBusinessMetric(reporting, { area: "brain", question: "Total revenue" }).answer, /28,000/);
});
