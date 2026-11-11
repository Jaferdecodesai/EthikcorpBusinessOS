import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, splitCsv } from "../server/csv.mjs";
import { crossCheck, validateTable } from "../server/quality.mjs";
import { QUESTIONS, instructionRecords, resolveQuestion } from "../server/semantic.mjs";
import { chunkMarkdown } from "../server/brain-pipeline.mjs";

const RAW = "https://raw.githubusercontent.com/Jaferdecodesai/ethikcorp-businessos-demo-data/main/";

function independentSum(rows, field, predicate = () => true) {
  return Math.round(rows.filter(predicate).reduce((total, row) => total + (Number(row[field]) || 0), 0));
}
function independentPercent(part, whole) {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

test("the csv parser keeps quoted commas, comments, money and dates", () => {
  const parsed = parseCsv("# SAMPLE DATA for demo\nname,amount,when\n\"Hello, world\",\"AED 1,200.50\",2026-01-02\n");
  assert.equal(parsed.comments.length, 1);
  assert.equal(parsed.rows[0].name, "Hello, world");
  assert.equal(parsed.rows[0].amount, 1200.5);
  assert.equal(parsed.schema.find((column) => column.name === "when").type, "date");
  assert.deepEqual(splitCsv("\"a,b\",c"), ["a,b", "c"]);
});

test("published tables match the consistency file and every numeric question", async () => {
  const load = async (path) => parseCsv(await (await fetch(`${RAW}${path}`)).text());
  const revenue = await load("sample-data/monthly-revenue-by-service-line.csv");
  const clients = await load("sample-data/clients.csv");
  const pipeline = await load("sample-data/sales-pipeline.csv");
  const hours = await load("sample-data/department-headcount-and-hours.csv");
  const consistency = JSON.parse(await (await fetch(`${RAW}sample-data/_consistency-check.json`)).text());
  const datasets = {
    revenue: { ...revenue, source: "sample-data/monthly-revenue-by-service-line.csv", sample: true },
    clients: { ...clients, source: "sample-data/clients.csv", sample: true },
    pipeline: { ...pipeline, source: "sample-data/sales-pipeline.csv", sample: true },
    hours: { ...hours, source: "sample-data/department-headcount-and-hours.csv", sample: true },
    consistency: { rows: [consistency], source: "sample-data/_consistency-check.json" }
  };
  for (const [path, table] of Object.entries({ "sample-data/monthly-revenue-by-service-line.csv": revenue, "sample-data/clients.csv": clients, "sample-data/sales-pipeline.csv": pipeline, "sample-data/department-headcount-and-hours.csv": hours })) {
    const result = validateTable(path, table);
    assert.equal(result.pass, true, result.checks.filter((check) => !check.pass).map((check) => check.detail).join("; "));
  }
  const cross = crossCheck(datasets);
  assert.equal(cross.pass, true, cross.checks.filter((check) => !check.pass).map((check) => check.detail).join("; "));
  const open = (row) => ["Discovery", "Qualification", "Proposal", "Negotiation"].includes(row.stage);
  const won = pipeline.rows.filter((row) => row.stage === "Closed Won");
  const lost = pipeline.rows.filter((row) => row.stage === "Closed Lost");
  const below = pipeline.rows.filter((row) => open(row) && row.win_probability_pct < 40);
  const period = (from, to) => independentSum(revenue.rows, "revenue_aed", (row) => row.month >= from && row.month <= to);
  const line = (name) => independentSum(revenue.rows, "revenue_aed", (row) => row.service_line === name);
  const byLine = [...new Set(revenue.rows.map((row) => row.service_line))].map((name) => ({ name, value: line(name) })).sort((left, right) => right.value - left.value);
  const topClient = [...clients.rows].sort((left, right) => right.revenue_recognized_ttm_aed - left.revenue_recognized_ttm_aed)[0];
  const dept = (name) => hours.rows.find((row) => row.department === name);
  const expected = new Map([
    ["What is total recognised revenue in AED?", independentSum(revenue.rows, "revenue_aed")],
    ["What is recognised revenue for Business Transformation Consulting?", line("Business Transformation Consulting")],
    ["What is recognised revenue for AI-Enabled Business Transformation?", line("AI-Enabled Business Transformation")],
    ["What is recognised revenue for AI Agents for Workflow Automation?", line("AI Agents for Workflow Automation")],
    ["What is recognised revenue for Corporate Training Programs?", line("Corporate Training Programs")],
    ["What is recognised revenue for Leadership Development & Culture Transformation?", line("Leadership Development & Culture Transformation")],
    ["What is recognised revenue for Gamification in Learning & Corporate Education?", line("Gamification in Learning & Corporate Education")],
    ["What is recognised revenue in October 2026?", period("2026-10", "2026-10")],
    ["What is recognised revenue in November 2025?", period("2025-11", "2025-11")],
    ["What is recognised revenue in 2026 Q1?", period("2026-01", "2026-03")],
    ["What is recognised revenue in 2026 Q2?", period("2026-04", "2026-06")],
    ["What is recognised revenue in 2026 Q3?", period("2026-07", "2026-09")],
    ["What is recognised revenue in the last 6 months?", period("2026-05", "2026-10")],
    ["Which service line has the highest recognised revenue?", byLine[0].value],
    ["Which service line has the lowest recognised revenue?", byLine[byLine.length - 1].value],
    ["What is total recognised revenue from clients?", independentSum(clients.rows, "revenue_recognized_ttm_aed")],
    ["Which client has the highest recognised revenue?", topClient.revenue_recognized_ttm_aed],
    ["How many clients are in the client file?", clients.rows.length],
    ["How many clients are Active?", clients.rows.filter((row) => row.status === "Active").length],
    ["What is recognised revenue from clients in Dubai?", independentSum(clients.rows, "revenue_recognized_ttm_aed", (row) => row.emirate === "Dubai")],
    ["What is the total contract value in AED?", independentSum(clients.rows, "contract_value_aed")],
    ["What is Closed Won bookings in AED?", independentSum(won, "value_aed")],
    ["How many deals are Closed Won?", won.length],
    ["What is the open pipeline gross in AED?", independentSum(pipeline.rows.filter(open), "value_aed")],
    ["What is the weighted open pipeline in AED?", Math.round(pipeline.rows.filter(open).reduce((total, row) => total + row.value_aed * row.win_probability_pct / 100, 0))],
    ["What is Closed Lost value in AED?", independentSum(lost, "value_aed")],
    ["What is the win rate by count?", independentPercent(won.length, won.length + lost.length)],
    ["What is the win rate by value?", independentPercent(independentSum(won, "value_aed"), independentSum(won, "value_aed") + independentSum(lost, "value_aed"))],
    ["What is the Negotiation stage value in AED?", independentSum(pipeline.rows, "value_aed", (row) => row.stage === "Negotiation")],
    ["What is the Proposal stage value in AED?", independentSum(pipeline.rows, "value_aed", (row) => row.stage === "Proposal")],
    ["How many open deals have win probability below 40 percent?", below.length],
    ["What is the gross value of open deals below 40 percent?", independentSum(below, "value_aed")],
    ["How many people are in the department file?", independentSum(hours.rows, "headcount")],
    ["What are total available hours in October 2026?", independentSum(hours.rows, "hours_available_oct_2026")],
    ["What are total utilised hours in October 2026?", independentSum(hours.rows, "hours_utilized_oct_2026")],
    ["What are total billable hours in October 2026?", independentSum(hours.rows, "billable_hours_oct_2026")],
    ["What is company utilisation percent?", independentPercent(independentSum(hours.rows, "hours_utilized_oct_2026"), independentSum(hours.rows, "hours_available_oct_2026"))],
    ["What is company billable percent?", independentPercent(independentSum(hours.rows, "billable_hours_oct_2026"), independentSum(hours.rows, "hours_available_oct_2026"))],
    ["What is the headcount of Sales & BD?", dept("Sales & BD").headcount],
    ["What is Consulting Delivery utilisation percent?", independentPercent(dept("Consulting Delivery").hours_utilized_oct_2026, dept("Consulting Delivery").hours_available_oct_2026)],
    ["What are Technology & AI billable hours?", dept("Technology & AI").billable_hours_oct_2026],
    ["What are Finance billable hours?", dept("Finance").billable_hours_oct_2026],
    ["Which department has the highest utilisation?", Math.max(...hours.rows.map((row) => independentPercent(row.hours_utilized_oct_2026, row.hours_available_oct_2026)))],
    ["What is Marketing utilisation percent?", independentPercent(dept("Marketing").hours_utilized_oct_2026, dept("Marketing").hours_available_oct_2026)],
    ["What is Client Success billable percent?", independentPercent(dept("Client Success").billable_hours_oct_2026, dept("Client Success").hours_available_oct_2026)]
  ]);
  assert.ok(expected.size >= 40);
  let correct = 0;
  for (const [question, value] of expected) {
    const answer = resolveQuestion(question, datasets);
    assert.equal(answer.refuse, false, question);
    assert.equal(answer.value, value, question);
    assert.ok(answer.provenance?.file, question);
    assert.ok(answer.provenance.rowsUsed > 0, question);
    correct += 1;
  }
  for (const question of ["What was recognised revenue in 2024?", "What is the CEO salary?", "What is revenue for a service line called Underwater Basket Weaving?"]) {
    const answer = resolveQuestion(question, datasets);
    assert.equal(answer.refuse, true, question);
    assert.match(answer.answer, /will not guess/);
    correct += 1;
  }
  assert.equal(correct, QUESTIONS.length);
  assert.equal(Math.round((expected.size / expected.size) * 100), 100);
  const lines = chunkMarkdown("workflows/sales-and-bd.md", "# Sales\n\nIntro\n\n## Workflow 1 — Lead\n\nBody");
  assert.equal(lines[1].heading, "Workflow 1 — Lead");
  assert.equal(lines[1].anchor, "workflow-1-lead");
  assert.equal(lines[1].source, "workflows/sales-and-bd.md");
  const records = instructionRecords(datasets);
  assert.equal(records.length, QUESTIONS.length);
});
