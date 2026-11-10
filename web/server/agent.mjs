import { answerFromChunks } from "./brain-pipeline.mjs";
import { analyzeRevenue, buildChart, queryDataset } from "./datasets.mjs";
import { proposeAutomations } from "./workflows.mjs";
import { REGION_LINE, workersAiNarrate, workersAiPlan } from "./llm/status.mjs";

const DATASETS = new Set(["revenue", "pipeline", "hours", "clients"]);
const CHARTS = new Set(["bar", "line", "area", "donut", "funnel", "flow", "kpi", "table"]);

export function routeQuestion(question) {
  const text = String(question || "").toLowerCase();
  if (/utili|headcount|hours/.test(text)) return "utilisation";
  if (/risk|at-risk|stuck|stall/.test(text)) return "risk";
  if (/1\s?m|million|where can we|more revenue|aed 1/.test(text)) return "opportunity";
  if (/revenue|service line|last 6|six month/.test(text)) return "revenue";
  if (/pipeline|funnel|deal/.test(text)) return "pipeline";
  if (/workflow|automat/.test(text)) return "automation";
  return "search";
}

export function planForRoute(route, question) {
  const lastMonths = /6|six/.test(String(question || "").toLowerCase()) ? 6 : null;
  if (route === "revenue") return [{ tool: "query_dataset", args: { dataset: "revenue", lastMonths, groupBy: "service_line" } }, { tool: "make_chart", args: { type: lastMonths ? "line" : "bar" } }, { tool: "analyze_revenue" }];
  if (route === "risk") return [{ tool: "query_dataset", args: { dataset: "pipeline", mode: "risk" } }, { tool: "make_chart", args: { type: "bar" } }, { tool: "analyze_revenue" }];
  if (route === "pipeline") return [{ tool: "query_dataset", args: { dataset: "pipeline", mode: "pipeline" } }, { tool: "make_chart", args: { type: "funnel" } }, { tool: "analyze_revenue" }];
  if (route === "utilisation") return [{ tool: "query_dataset", args: { dataset: "hours" } }, { tool: "make_chart", args: { type: "bar" } }, { tool: "analyze_revenue" }];
  if (route === "opportunity") return [{ tool: "analyze_revenue" }, { tool: "make_chart", args: { type: "bar" } }, { tool: "search_brain" }];
  if (route === "automation") return [{ tool: "propose_automation" }, { tool: "make_chart", args: { type: "flow" } }];
  return [{ tool: "search_brain" }, { tool: "analyze_revenue" }];
}

export function safeCall(call, question) {
  if (!call?.tool) return null;
  if (call.tool === "query_dataset") {
    const dataset = DATASETS.has(call.args?.dataset) ? call.args.dataset : planForRoute(routeQuestion(question), question).find((item) => item.tool === "query_dataset")?.args?.dataset;
    if (!dataset) return null;
    const lastMonths = Number(call.args?.lastMonths);
    return { tool: "query_dataset", args: { dataset, lastMonths: lastMonths >= 1 && lastMonths <= 12 ? lastMonths : planForRoute(routeQuestion(question), question).find((item) => item.tool === "query_dataset")?.args?.lastMonths || null, mode: call.args?.mode || (routeQuestion(question) === "risk" ? "risk" : routeQuestion(question) === "pipeline" ? "pipeline" : null), groupBy: call.args?.groupBy || (dataset === "revenue" ? "service_line" : dataset === "pipeline" ? "stage" : null) } };
  }
  if (call.tool === "make_chart") return { tool: "make_chart", args: { type: CHARTS.has(call.args?.type) ? call.args.type : "bar" } };
  if (["search_brain", "analyze_revenue", "propose_automation", "create_task"].includes(call.tool)) return { tool: call.tool, args: {} };
  return null;
}

export async function runAgent(brain, question, options = {}) {
  const route = routeQuestion(question);
  let calls = planForRoute(route, question);
  let planner = "deterministic";
  if (options.ai) {
    const suggested = await workersAiPlan(options.ai, question);
    const safe = (suggested || []).map((call) => safeCall(call, question)).filter(Boolean).slice(0, 5);
    if (safe.length) { calls = safe; planner = "workers-ai"; }
  }
  const steps = [];
  const outputs = [];
  const emit = (step) => { steps.push(step); options.onStep?.(step); };
  emit({ tool: "plan", status: "done", detail: planner === "workers-ai" ? `Workers AI planned ${calls.length} tool calls. ${REGION_LINE}` : `Deterministic planner chose ${calls.length} tools. No Workers AI call. ${REGION_LINE}` });
  const context = { rows: [], raw: null };
  for (const call of calls.slice(0, 5)) {
    const output = executeTool(call, brain, question, context);
    if (output.rows) context.rows = output.rows;
    if (output.raw) context.raw = output.raw;
    outputs.push(output);
    emit({ tool: call.tool, status: output.ok === false ? "error" : "done", detail: output.detail });
  }
  const lastRows = context.rows;
  const chart = outputs.find((item) => item.chart)?.chart || null;
  const citations = outputs.flatMap((item) => item.citations || []);
  const fixes = (outputs.find((item) => item.fixes)?.fixes || analyzeRevenue(brain.datasets || {}).opportunities).slice(0, 4);
  let answer = renderAnswer(route, lastRows, citations);
  if (options.ai) {
    const narrative = await workersAiNarrate(options.ai, question, outputs.map(({ detail, rows, citations: cites, fixes: actions }) => ({ detail, rows, citations: cites, fixes: actions })));
    if (narrative) { answer = narrative; emit({ tool: "narrate", status: "done", detail: "Narrative uses only numbers present in the tool outputs." }); }
    else emit({ tool: "narrate", status: "done", detail: "Narrative was not used. Figures stayed with the tool results." });
  }
  return { answer, steps, chart, fixes, citations, sample: Boolean(brain.datasets?.revenue), llm: planner === "workers-ai" ? "workers-ai" : "not_configured", region: REGION_LINE };
}

function executeTool(call, brain, question, context) {
  const datasets = brain.datasets || {};
  if (call.tool === "query_dataset") {
    const args = call.args || {};
    const filters = args.mode === "risk" ? [{ field: "stage", op: "in", value: ["Discovery", "Qualification", "Proposal", "Negotiation"] }, { field: "win_probability_pct", op: "lt", value: 40 }] : args.mode === "pipeline" ? [{ field: "stage", op: "not_in", value: ["Closed Lost"] }] : [];
    const groupBy = args.dataset === "hours" ? null : args.groupBy;
    const field = args.dataset === "revenue" ? "revenue_aed" : "value_aed";
    const result = queryDataset(datasets, { dataset: args.dataset, lastMonths: args.lastMonths, filters, groupBy, aggregate: groupBy ? { field, op: "sum" } : null, sort: groupBy ? "value" : null });
    return { ok: result.ok, detail: result.ok ? `${result.rows.length} ${args.dataset} rows.` : result.error, rows: result.rows, raw: args.lastMonths ? queryDataset(datasets, { dataset: args.dataset, lastMonths: args.lastMonths }).rows : null };
  }
  if (call.tool === "make_chart") {
    const type = call.args?.type || "bar";
    const rows = context.rows || [];
    const chart = rows[0]?.impactAed != null
      ? buildChart(rows.map((row) => ({ label: row.title, value: row.impactAed })), { type: "bar", title: "Revenue actions", unit: "AED" })
      : (type === "line" || type === "area") && context.raw
        ? buildChart(context.raw, { type, title: "Revenue by service line, last 6 months", series: "service_line", unit: "AED" })
        : buildChart(rows.map((row) => ({ stage: row.stage, service_line: row.service_line, department: row.department, label: row.label || row.name || row.title, value: row.value ?? row.utilisation_pct ?? row.impactAed })), { type: type === "flow" ? "bar" : type, title: chartTitle(question, type), unit: /utili/.test(String(question).toLowerCase()) ? "%" : "AED" });
    return { ok: true, detail: `${chart.type} from query_dataset rows.`, chart, rows };
  }
  if (call.tool === "analyze_revenue") {
    const analysis = analyzeRevenue(datasets);
    return { ok: true, detail: `${analysis.opportunities.length} actions from the indexed tables.`, fixes: analysis.opportunities, rows: analysis.opportunities };
  }
  if (call.tool === "propose_automation") {
    const map = brain.workflowMaps?.[call.args?.departmentId] || Object.values(brain.workflowMaps || {})[0];
    const proposals = map ? proposeAutomations(map, datasets) : [];
    return { ok: true, detail: `${proposals.length} proposals from the workflow file.`, rows: proposals };
  }
  if (call.tool === "create_task") return { ok: true, detail: "Task creation stays on the button. The model cannot file a task by itself.", rows: [] };
  const found = answerFromChunks(question, brain.chunks || []);
  return { ok: true, detail: found.citations?.length ? `Cited ${found.citations[0].document}.` : "No matching passage.", citations: found.citations || [], rows: found.citations || [] };
}

function chartTitle(question, type) {
  const text = question.toLowerCase();
  if (/risk/.test(text)) return "Deals below 40% probability";
  if (/utili/.test(text)) return "Department utilisation, October 2026";
  if (/pipeline|funnel/.test(text)) return "Pipeline by stage";
  if (/revenue/.test(text)) return type === "line" ? "Revenue by service line, last 6 months" : "Revenue by service line";
  return "Live insight";
}

function renderAnswer(route, rows, citations) {
  if (route === "search") {
    if (!citations.length) return "No indexed passage matches that question. I will not guess.";
    return `Cited passage from ${citations[0].document}. Figures, when shown, come from the indexed tables.`;
  }
  if (!rows?.length) return "The indexed tables do not have rows for that question yet. Ingest the demo sources first. I will not invent a figure.";
  if (route === "opportunity") return `The largest computed action is ${rows[0].title}: AED ${Number(rows[0].impactAed).toLocaleString("en-AE")}.`;
  const preview = rows.slice(0, 4).map((row) => `${row.service_line || row.stage || row.department || row.name || row.title}: ${row.value ?? row.impactAed ?? row.utilisation_pct}`).join("; ");
  return `Figures are from the indexed tables. ${preview}.`;
}
