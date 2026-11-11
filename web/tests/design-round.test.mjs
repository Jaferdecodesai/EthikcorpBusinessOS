import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "../server/csv.mjs";
import { validateTable } from "../server/quality.mjs";
import { KPI_TARGETS_CSV, KPI_TARGETS_PATH } from "../server/kpi-targets.mjs";
import { buildChart, buildOverview, coerceChartType, projectModel } from "../server/datasets.mjs";
import { planForRoute, safeCall } from "../server/agent.mjs";
import { ingestDemoFile } from "../server/demo-intake.mjs";
import { emptyBrain } from "../server/brain-pipeline.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = readFileSync(path.join(root, "fixtures/demo/sample-data/kpi-targets.csv"), "utf8");

test("the sample kpi target file matches the bundled fixture and passes validation", () => {
  assert.equal(KPI_TARGETS_CSV, fixture);
  assert.match(fixture.split("\n")[0], /SAMPLE DATA for demo/);
  const table = parseCsv(fixture);
  const validation = validateTable(KPI_TARGETS_PATH, table);
  assert.equal(validation.pass, true);
  assert.equal(table.rows.length, 40);
  assert.ok(table.rows.every((row) => row.metric_id && Number.isFinite(row.target_value)));
});

test("the chart picker only emits bar, column, donut or kpi", () => {
  for (const type of ["line", "area", "funnel", "flow", "sparkline", "table"]) assert.equal(["bar", "column"].includes(coerceChartType(type)), true);
  assert.equal(coerceChartType("donut"), "donut");
  assert.equal(coerceChartType("pie"), "pie");
  assert.equal(safeCall({ tool: "make_chart", args: { type: "line" } }, "revenue").args.type, "column");
  assert.equal(safeCall({ tool: "make_chart", args: { type: "flow" } }, "workflow").args.type, "bar");
  const revenue = planForRoute("revenue", "Revenue by service line, last 6 months");
  assert.equal(revenue.find((call) => call.tool === "make_chart").args.type, "column");
  assert.equal(planForRoute("automation", "automate the workflow").find((call) => call.tool === "make_chart").args.type, "bar");
  assert.equal(planForRoute("pipeline", "show the pipeline").find((call) => call.tool === "make_chart").args.type, "bar");
  const chart = buildChart([{ month: "2026-10", month_label: "Oct 2026", service_line: "Training", revenue_aed: 10 }, { month: "2026-09", month_label: "Sep 2026", service_line: "Training", revenue_aed: 8 }], { type: "area", title: "Revenue by month" });
  assert.equal(chart.type, "column");
  assert.equal(chart.series.length, 1);
});

test("indexed targets mark utilisation below target and revenue on target for May to October", async () => {
  const raw = "https://raw.githubusercontent.com/Jaferdecodesai/ethikcorp-businessos-demo-data/main/";
  const load = async (file) => parseCsv(await (await fetch(`${raw}${file}`)).text());
  const [revenue, pipeline, hours] = await Promise.all(["sample-data/monthly-revenue-by-service-line.csv", "sample-data/sales-pipeline.csv", "sample-data/department-headcount-and-hours.csv"].map(load));
  const targets = parseCsv(fixture);
  const overview = buildOverview(projectModel({ revenue, pipeline, hours, targets }), { period: "last-6" });
  const byId = Object.fromEntries(overview.kpis.map((kpi) => [kpi.id, kpi]));
  assert.equal(byId.revenue.value, 5170000);
  assert.equal(byId.revenue.target, 5000000);
  assert.equal(byId.revenue.status, "on-target");
  assert.equal(byId.utilisation.value, 77.3);
  assert.equal(byId.utilisation.target, 80);
  assert.equal(byId.utilisation.status, "below-target");
  assert.equal(byId.pipeline.status, "on-target");
  assert.equal(byId["win-rate"].status, "on-target");
  assert.equal(overview.charts.map((chart) => chart.type).join(","), "bar,donut,column,bar");
  assert.ok(overview.charts.every((chart) => !["line", "area", "flow"].includes(chart.type)));
  const training = overview.charts[0].series.find((item) => item.name.startsWith("Corporate Training"));
  const leadership = overview.charts[0].series.find((item) => item.name.startsWith("Leadership"));
  assert.equal(training.belowTarget, true);
  assert.equal(leadership.belowTarget, true);
  const ingested = await ingestDemoFile(emptyBrain(), KPI_TARGETS_PATH, async () => ({ ok: false, text: async () => "" }));
  assert.equal(ingested.ok, true);
  assert.equal(ingested.brain.datasets.targets.validation.pass, true);
  assert.equal(ingested.brain.datasets.targets.rows.length, 40);
});
