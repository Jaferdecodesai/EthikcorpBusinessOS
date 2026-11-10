import { answerFromChunks } from "./brain-pipeline.mjs";
import { analyzeRevenue, buildChart, queryDataset } from "./datasets.mjs";
import { proposeAutomations } from "./workflows.mjs";
import { REGION_LINE, workersAiPlan } from "./llm/status.mjs";

export function routeQuestion(question) {
  const text = String(question || "").toLowerCase();
  if (/utili|headcount|hours/.test(text)) return "utilisation";
  if (/risk|at-risk|stuck|stall/.test(text)) return "risk";
  if (/revenue|service line|last 6|six month/.test(text)) return "revenue";
  if (/pipeline|funnel|deal/.test(text)) return "pipeline";
  if (/workflow|automat/.test(text)) return "automation";
  return "search";
}

export async function runAgent(brain, question, options = {}) {
  const route = routeQuestion(question);
  const hinted = options.ai ? await workersAiPlan(options.ai, question) : null;
  const chosen = hinted === "query_dataset" || hinted === "analyze_revenue" ? route : route;
  const steps = [{ tool: "plan", status: "done", detail: `Route: ${chosen}. ${hinted ? `Workers AI hinted ${hinted}.` : "No Workers AI call. The deterministic planner chose the tools."} ${REGION_LINE}` }];
  const datasets = brain.datasets || {};
  let rows = [];
  let chart = null;
  let citations = [];
  if (chosen === "revenue") {
    const query = { dataset: "revenue", lastMonths: /6|six/.test(question.toLowerCase()) ? 6 : null };
    const result = queryDataset(datasets, query);
    steps.push({ tool: "query_dataset", status: result.ok ? "done" : "error", detail: result.ok ? `${result.rows.length} revenue rows.` : result.error });
    const grouped = queryDataset(datasets, { dataset: "revenue", lastMonths: query.lastMonths, groupBy: "service_line", aggregate: { field: "revenue_aed", op: "sum" }, sort: "value" });
    rows = grouped.rows;
    chart = query.lastMonths ? buildChart(result.rows, { type: "line", title: "Revenue by service line, last 6 months", series: "service_line", unit: "AED" }) : buildChart(grouped.rows.map((row) => ({ service_line: row.service_line, value: row.value })), { type: "bar", title: "Revenue by service line", unit: "AED" });
    steps.push({ tool: "make_chart", status: "done", detail: `${chart.type} from query_dataset rows.` });
  } else if (chosen === "risk" || chosen === "pipeline") {
    const result = queryDataset(datasets, { dataset: "pipeline", filters: chosen === "risk" ? [{ field: "stage", op: "in", value: ["Discovery", "Qualification", "Proposal", "Negotiation"] }, { field: "win_probability_pct", op: "lt", value: 40 }] : [{ field: "stage", op: "not_in", value: ["Closed Lost"] }], groupBy: "stage", aggregate: { field: "value_aed", op: "sum" } });
    steps.push({ tool: "query_dataset", status: result.ok ? "done" : "error", detail: result.ok ? `${result.rows.length} groups.` : result.error });
    rows = result.rows;
    chart = buildChart(rows.map((row) => ({ stage: row.stage, value: row.value })), { type: chosen === "pipeline" ? "funnel" : "bar", title: chosen === "risk" ? "Deals below 40% probability" : "Pipeline by stage", unit: "AED" });
    steps.push({ tool: "make_chart", status: "done", detail: `${chart.type} from query_dataset rows.` });
  } else if (chosen === "utilisation") {
    const result = queryDataset(datasets, { dataset: "hours" });
    steps.push({ tool: "query_dataset", status: result.ok ? "done" : "error", detail: result.ok ? `${result.rows.length} departments.` : result.error });
    rows = result.rows;
    chart = buildChart(rows.map((row) => ({ department: row.department, value: row.utilisation_pct })), { type: "bar", title: "Department utilisation, October 2026", unit: "%" });
    steps.push({ tool: "make_chart", status: "done", detail: "bar from query_dataset rows." });
  } else if (chosen === "automation") {
    const map = Object.values(brain.workflowMaps || {})[0];
    const proposals = map ? proposeAutomations(map, datasets) : [];
    steps.push({ tool: "propose_automation", status: "done", detail: `${proposals.length} proposals from the workflow file.` });
    rows = proposals;
    chart = { id: "chart-flow-auto", type: "flow", title: map ? `${map.departmentId} workflow` : "Workflow", sample: true, series: (map?.flows?.[0]?.steps || []).map((step, index) => ({ name: step, value: index + 1 })) };
  } else {
    const found = answerFromChunks(question, brain.chunks || []);
    citations = found.citations || [];
    steps.push({ tool: "search_brain", status: "done", detail: citations.length ? `Cited ${citations[0].document}.` : "No matching passage." });
    rows = citations;
  }
  const analysis = analyzeRevenue(datasets);
  steps.push({ tool: "analyze_revenue", status: "done", detail: `${analysis.opportunities.length} actions from the indexed tables.` });
  const answer = renderAnswer(chosen, rows, citations);
  return { answer, steps, chart, fixes: analysis.opportunities.slice(0, 4), citations, sample: Boolean(datasets.revenue), llm: options.ai ? "workers-ai" : "not_configured", region: REGION_LINE };
}

function renderAnswer(route, rows, citations) {
  if (route === "search") {
    if (!citations.length) return "No indexed passage matches that question. I will not guess.";
    return `Cited passage from ${citations[0].document}. The numbers below, if any, come from query_dataset rather than this passage.`;
  }
  if (!rows.length) return "The indexed tables do not have rows for that question yet. Ingest the demo sources first. I will not invent a figure.";
  if (route === "revenue" || route === "risk" || route === "pipeline" || route === "utilisation") {
    const preview = rows.slice(0, 6).map((row) => `${row.service_line || row.stage || row.department || row.name}: ${row.value ?? row.revenue_aed ?? row.utilisation_pct}`).join("; ");
    return `Figures are from query_dataset. ${preview}.`;
  }
  return `Prepared ${rows.length} automation proposals from the workflow file and the sample hourly rate.`;
}
