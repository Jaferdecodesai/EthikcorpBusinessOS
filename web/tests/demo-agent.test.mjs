import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../server/csv.mjs";
import { queryDataset, analyzeRevenue } from "../server/datasets.mjs";
import { buildChart } from "../server/datasets.mjs";
import { handleBrain } from "../server/brain-api.mjs";
import { emptyBrain, portalAccess } from "../server/brain-pipeline.mjs";
import { ingestDemoFile, probeDrive } from "../server/demo-intake.mjs";
import { parseWorkflow, proposeAutomations } from "../server/workflows.mjs";

const RAW = "https://raw.githubusercontent.com/Jaferdecodesai/ethikcorp-businessos-demo-data/main/";

async function text(path) {
  const response = await fetch(`${RAW}${path}`);
  assert.equal(response.ok, true);
  return response.text();
}

test("sample revenue totals match the published consistency check", async () => {
  const [revenueText, consistencyText, pipelineText, hoursText] = await Promise.all(["sample-data/monthly-revenue-by-service-line.csv", "sample-data/_consistency-check.json", "sample-data/sales-pipeline.csv", "sample-data/department-headcount-and-hours.csv"].map(text));
  const consistency = JSON.parse(consistencyText);
  const datasets = { revenue: parseCsv(revenueText), pipeline: parseCsv(pipelineText), hours: parseCsv(hoursText) };
  const grouped = queryDataset(datasets, { dataset: "revenue", groupBy: "service_line", aggregate: { field: "revenue_aed", op: "sum" } });
  const total = grouped.rows.reduce((sum, row) => sum + row.value, 0);
  assert.equal(total, consistency.recognised_revenue_ttm);
  assert.equal(total, 9600000);
  for (const row of grouped.rows) assert.equal(row.value, consistency.revenue_by_service_line[row.service_line]);
  const chart = buildChart(grouped.rows.map((row) => ({ service_line: row.service_line, value: row.value })), { type: "bar", title: "Revenue by service line", unit: "AED" });
  assert.equal(chart.type, "bar");
  assert.equal(chart.series.reduce((sum, item) => sum + item.value, 0), 9600000);
  const fixes = analyzeRevenue(datasets);
  assert.ok(fixes.opportunities.length >= 2);
  assert.match(fixes.opportunities[0].formula, /value_aed/);
});

test("a sign-in redirect is reported as Drive access pending and GitHub still ingests", async () => {
  const pending = await probeDrive(async () => ({ status: 302, ok: false, headers: { get: () => "https://accounts.google.com/ServiceLogin" }, text: async () => "" }), { files: [{ path: "sample-data/clients.csv", download_url: "https://drive.google.com/uc?export=download&id=1" }] });
  assert.equal(pending.detail, "Drive access pending");
  const csv = await text("sample-data/clients.csv");
  const result = await ingestDemoFile(emptyBrain(), "sample-data/clients.csv", async () => ({ ok: true, text: async () => csv }));
  assert.equal(result.ok, true);
  assert.equal(result.brain.datasets.clients.rows.length, 16);
  assert.equal(result.sample, true);
});

test("the customer stays locked out of Businessbots until every department is confirmed", async () => {
  const brain = emptyBrain();
  const blocked = await handleBrain(brain, { method: "POST", pathname: "/api/brain/ask", body: { question: "revenue", area: "bots" }, role: "customer", sessionId: "c", connectors: {}, env: {} });
  assert.equal(blocked.status, 403);
  const open = portalAccess("dev", brain);
  assert.equal(open.tabs.find((tab) => tab.id === "bots").enabled, true);
});

test("a workflow file proposes automations from its stated hours", async () => {
  const markdown = await text("workflows/sales-and-bd.md");
  const map = parseWorkflow(markdown, "sales");
  assert.ok(map.flows.length >= 1);
  assert.ok(map.flows[0].weeklyHours > 0);
  const proposals = proposeAutomations(map, { revenue: { rows: [{ revenue_aed: 9600000 }] }, hours: { rows: [{ billable_hours_oct_2026: 1592 }] } });
  assert.ok(proposals.length >= 1);
  assert.equal(proposals[0].formula, "weekly_hours × 4 × 0.4");
  assert.equal(proposals[0].impactAed, Math.round(proposals[0].hoursSavedPerMonth * (9600000 / 12 / 1592)));
});
