import { queryDataset } from "./datasets.mjs";

const LINES = {
  "business transformation consulting": "Business Transformation Consulting",
  "business transformation": "Business Transformation Consulting",
  "ai-enabled business transformation": "AI-Enabled Business Transformation",
  "ai enabled": "AI-Enabled Business Transformation",
  "ai agents for workflow automation": "AI Agents for Workflow Automation",
  "ai agents": "AI Agents for Workflow Automation",
  "corporate training programs": "Corporate Training Programs",
  "corporate training": "Corporate Training Programs",
  "leadership development & culture transformation": "Leadership Development & Culture Transformation",
  "leadership development": "Leadership Development & Culture Transformation",
  "gamification in learning & corporate education": "Gamification in Learning & Corporate Education",
  "gamification": "Gamification in Learning & Corporate Education"
};

const DEPARTMENTS = {
  "sales & bd": "Sales & BD",
  "sales and bd": "Sales & BD",
  sales: "Sales & BD",
  marketing: "Marketing",
  "consulting delivery": "Consulting Delivery",
  delivery: "Consulting Delivery",
  "technology & ai": "Technology & AI",
  technology: "Technology & AI",
  finance: "Finance",
  "hr & talent": "HR & Talent",
  hr: "HR & Talent",
  operations: "Operations",
  "client success": "Client Success",
  "legal & compliance": "Legal & Compliance",
  legal: "Legal & Compliance"
};

export const KPI_DEFINITIONS = [
  { id: "recognised_revenue", field: "revenue_aed", formula: "sum(revenue_aed) on monthly-revenue-by-service-line.csv", target: null, note: "The sample corpus has no revenue target." },
  { id: "win_rate_count", formula: "count(Closed Won) / count(Closed Won + Closed Lost)", target: null, note: "Count-based. Value-weighted win rate is a separate metric." },
  { id: "win_rate_value", formula: "sum(Closed Won value_aed) / sum(Closed Won + Closed Lost value_aed)", target: null, note: "The sample corpus has no win-rate target." },
  { id: "utilisation", formula: "sum(hours_utilized_oct_2026) / sum(hours_available_oct_2026)", target: null, note: "October 2026 snapshot only. No utilisation target is in the file." },
  { id: "billable_percent", formula: "sum(billable_hours_oct_2026) / sum(hours_available_oct_2026)", target: null, note: "October 2026 snapshot only. No billable target is in the file." }
];

export function buildSemanticLayer() {
  return {
    status: "built",
    synonyms: { sales: "Sales & BD", revenue: "revenue_aed", utilisation: "hours_utilized_oct_2026 / hours_available_oct_2026" },
    serviceLineAliases: LINES,
    departmentAliases: DEPARTMENTS,
    kpis: KPI_DEFINITIONS,
    finetune: "not_run"
  };
}

export function resolveQuestion(question, datasets) {
  const text = String(question || "").toLowerCase().replace(/[?]/g, "").trim();
  const exact = QUESTIONS.some((item) => item.question.toLowerCase().replace(/[?]/g, "") === text);
  if (!exact) return /2024|salary|profit margin|nps|underwater/.test(text) ? refuse("The indexed tables do not contain that. I will not guess.") : null;
  if (!datasets?.revenue?.rows || !datasets?.clients?.rows || !datasets?.pipeline?.rows || !datasets?.hours?.rows) return refuse("The sample tables are not all indexed. I will not guess.");
  const line = matchAlias(text, LINES);
  const department = matchAlias(text, DEPARTMENTS);
  if (/highest recognised revenue/.test(text) && /service line/.test(text)) return topLine(datasets, true);
  if (/lowest recognised revenue/.test(text) && /service line/.test(text)) return topLine(datasets, false);
  if (/highest recognised revenue/.test(text) && /client/.test(text)) return topClient(datasets);
  if (/highest utilisation/.test(text)) return topDepartment(datasets, "utilisation");
  if (line && /revenue/.test(text)) return revenueForLine(datasets, line);
  if (/october 2026/.test(text) && /revenue/.test(text)) return revenuePeriod(datasets, { from: "2026-10", to: "2026-10" }, "October 2026");
  if (/november 2025/.test(text) && /revenue/.test(text)) return revenuePeriod(datasets, { from: "2025-11", to: "2025-11" }, "November 2025");
  if (/2026 q1/.test(text)) return revenuePeriod(datasets, { quarter: "2026-Q1" }, "2026 Q1");
  if (/2026 q2/.test(text)) return revenuePeriod(datasets, { quarter: "2026-Q2" }, "2026 Q2");
  if (/2026 q3/.test(text)) return revenuePeriod(datasets, { quarter: "2026-Q3" }, "2026 Q3");
  if (/last 6 months/.test(text)) return revenuePeriod(datasets, { lastMonths: 6 }, "the last 6 months");
  if (/total recognised revenue from clients/.test(text)) return clientSum(datasets);
  if (/total recognised revenue/.test(text)) return revenuePeriod(datasets, {}, "the trailing twelve months");
  if (/how many clients are active/.test(text)) return countWhere(datasets, "clients", [{ field: "status", op: "eq", value: "Active" }], "Active clients");
  if (/how many clients/.test(text)) return countWhere(datasets, "clients", [], "clients");
  if (/clients in dubai/.test(text)) return sumWhere(datasets, "clients", "revenue_recognized_ttm_aed", [{ field: "emirate", op: "eq", value: "Dubai" }], "Dubai recognised revenue");
  if (/total contract value/.test(text)) return sumWhere(datasets, "clients", "contract_value_aed", [], "contract value");
  if (/closed won bookings/.test(text)) return sumWhere(datasets, "pipeline", "value_aed", [{ field: "stage", op: "eq", value: "Closed Won" }], "Closed Won bookings");
  if (/how many deals are closed won/.test(text)) return countWhere(datasets, "pipeline", [{ field: "stage", op: "eq", value: "Closed Won" }], "Closed Won deals");
  if (/open pipeline gross/.test(text)) return sumWhere(datasets, "pipeline", "value_aed", [{ field: "stage", op: "in", value: ["Discovery", "Qualification", "Proposal", "Negotiation"] }], "open pipeline");
  if (/weighted open pipeline/.test(text)) return weightedOpen(datasets);
  if (/closed lost value/.test(text)) return sumWhere(datasets, "pipeline", "value_aed", [{ field: "stage", op: "eq", value: "Closed Lost" }], "Closed Lost value");
  if (/win rate by value/.test(text)) return winRate(datasets, true);
  if (/win rate by count/.test(text)) return winRate(datasets, false);
  if (/negotiation stage value/.test(text)) return sumWhere(datasets, "pipeline", "value_aed", [{ field: "stage", op: "eq", value: "Negotiation" }], "Negotiation value");
  if (/proposal stage value/.test(text)) return sumWhere(datasets, "pipeline", "value_aed", [{ field: "stage", op: "eq", value: "Proposal" }], "Proposal value");
  if (/how many open deals have win probability below 40/.test(text)) return countWhere(datasets, "pipeline", [{ field: "stage", op: "in", value: ["Discovery", "Qualification", "Proposal", "Negotiation"] }, { field: "win_probability_pct", op: "lt", value: 40 }], "open deals below 40 percent");
  if (/gross value of open deals below 40/.test(text)) return sumWhere(datasets, "pipeline", "value_aed", [{ field: "stage", op: "in", value: ["Discovery", "Qualification", "Proposal", "Negotiation"] }, { field: "win_probability_pct", op: "lt", value: 40 }], "gross value below 40 percent");
  if (/how many people/.test(text)) return sumWhere(datasets, "hours", "headcount", [], "people", "people");
  if (/total available hours/.test(text)) return sumWhere(datasets, "hours", "hours_available_oct_2026", [], "available hours");
  if (/total utilised hours/.test(text)) return sumWhere(datasets, "hours", "hours_utilized_oct_2026", [], "utilised hours");
  if (/total billable hours/.test(text)) return sumWhere(datasets, "hours", "billable_hours_oct_2026", [], "billable hours");
  if (/company utilisation percent/.test(text)) return companyRatio(datasets, "utilisation");
  if (/company billable percent/.test(text)) return companyRatio(datasets, "billable");
  if (department && /headcount/.test(text)) return departmentField(datasets, department, "headcount", "people");
  if (department && /billable percent/.test(text)) return departmentRatio(datasets, department, "billable");
  if (department && /utilisation percent/.test(text)) return departmentRatio(datasets, department, "utilisation");
  if (department && /billable hours/.test(text)) return departmentField(datasets, department, "billable_hours_oct_2026", "hours");
  return refuse("The indexed tables do not answer that question. I will not guess.");
}

function matchAlias(text, table) {
  return Object.entries(table).sort((left, right) => right[0].length - left[0].length).find(([alias]) => text.includes(alias))?.[1] || "";
}

function revenueForLine(datasets, line) {
  return sumWhere(datasets, "revenue", "revenue_aed", [{ field: "service_line", op: "eq", value: line }], `${line} recognised revenue`);
}

function revenuePeriod(datasets, query, label) {
  const result = queryDataset(datasets, { dataset: "revenue", ...query, aggregate: { field: "revenue_aed", op: "sum" } });
  const value = result.rows.reduce((total, row) => total + (Number(row.revenue_aed) || Number(row.value) || 0), 0);
  return answer(Math.round(value), "AED", label, result);
}

function topLine(datasets, highest) {
  const result = queryDataset(datasets, { dataset: "revenue", groupBy: "service_line", aggregate: { field: "revenue_aed", op: "sum" }, sort: "value" });
  const row = highest ? result.rows[0] : result.rows[result.rows.length - 1];
  return { ...answer(row?.value || 0, "AED", row?.service_line || "", result), label: row?.service_line || "" };
}

function topClient(datasets) {
  const result = queryDataset(datasets, { dataset: "clients", sort: "revenue_recognized_ttm_aed", limit: 1 });
  const row = result.rows[0];
  return { ...answer(row?.revenue_recognized_ttm_aed || 0, "AED", row?.client_name || "", result), label: row?.client_name || "" };
}

function topDepartment(datasets, kind) {
  const rows = datasets.hours.rows.map((row) => ({ ...row, score: kind === "billable" ? percent(row.billable_hours_oct_2026, row.hours_available_oct_2026) : percent(row.hours_utilized_oct_2026, row.hours_available_oct_2026) }));
  rows.sort((left, right) => right.score - left.score);
  const result = queryDataset(datasets, { dataset: "hours" });
  return { ...answer(rows[0].score, "%", rows[0].department, result), label: rows[0].department };
}

function clientSum(datasets) {
  return sumWhere(datasets, "clients", "revenue_recognized_ttm_aed", [], "client recognised revenue");
}

function companyRatio(datasets, kind) {
  const field = kind === "billable" ? "billable_hours_oct_2026" : "hours_utilized_oct_2026";
  const result = queryDataset(datasets, { dataset: "hours", ratio: kind });
  const rows = datasets.hours.rows;
  const value = percent(rows.reduce((total, row) => total + Number(row[field]), 0), rows.reduce((total, row) => total + Number(row.hours_available_oct_2026), 0));
  return answer(value, "%", kind === "billable" ? "company billable percent" : "company utilisation percent", { ...result, rows: [{ value }] });
}

function departmentField(datasets, department, field, unit) {
  return sumWhere(datasets, "hours", field, [{ field: "department", op: "eq", value: department }], `${department} ${field}`, unit === "people" ? "people" : "hours");
}

function departmentRatio(datasets, department, kind) {
  const result = queryDataset(datasets, { dataset: "hours", filters: [{ field: "department", op: "eq", value: department }] });
  const row = result.rows[0];
  if (!row) return refuse(`${department} is not in the hours file.`);
  const value = kind === "billable" ? percent(row.billable_hours_oct_2026, row.hours_available_oct_2026) : percent(row.hours_utilized_oct_2026, row.hours_available_oct_2026);
  return answer(value, "%", `${department} ${kind}`, result);
}

function winRate(datasets, byValue) {
  const result = queryDataset(datasets, { dataset: "pipeline", filters: [{ field: "stage", op: "in", value: ["Closed Won", "Closed Lost"] }] });
  const won = result.rows.filter((row) => row.stage === "Closed Won");
  const lost = result.rows.filter((row) => row.stage === "Closed Lost");
  const value = byValue ? percent(won.reduce((total, row) => total + row.value_aed, 0), won.reduce((total, row) => total + row.value_aed, 0) + lost.reduce((total, row) => total + row.value_aed, 0)) : percent(won.length, won.length + lost.length);
  return answer(value, "%", byValue ? "win rate by value" : "win rate by count", result);
}

function weightedOpen(datasets) {
  const result = queryDataset(datasets, { dataset: "pipeline", filters: [{ field: "stage", op: "in", value: ["Discovery", "Qualification", "Proposal", "Negotiation"] }] });
  const value = Math.round(result.rows.reduce((total, row) => total + Number(row.value_aed) * Number(row.win_probability_pct) / 100, 0));
  return answer(value, "AED", "weighted open pipeline", result);
}

function sumWhere(datasets, dataset, field, filters, label, unit = "AED") {
  const result = queryDataset(datasets, { dataset, filters, aggregate: { field, op: "sum" } });
  const value = Math.round(result.rows.reduce((total, row) => total + (Number(row[field]) || Number(row.value) || 0), 0));
  return answer(value, unit === "people" || unit === "hours" ? unit : "AED", label, result);
}

function countWhere(datasets, dataset, filters, label) {
  const result = queryDataset(datasets, { dataset, filters });
  return answer(result.matched, "count", label, result);
}

function answer(value, unit, label, result) {
  return { ok: true, refuse: false, value, unit, label, provenance: result.provenance, rows: (result.rows || []).slice(0, 12), answer: `${label}: ${value} ${unit}.` };
}

function refuse(answerText) {
  return { ok: false, refuse: true, value: null, answer: answerText };
}

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function instructionRecords(datasets) {
  return QUESTIONS.map((item) => {
    const resolved = resolveQuestion(item.question, datasets);
    return { messages: [{ role: "system", content: "Answer only from Ethikcorp sample tables. Cite the file. Refuse when the tables do not contain the answer." }, { role: "user", content: item.question }, { role: "assistant", content: `${resolved.answer} Source: ${resolved.provenance?.file || "none"}.` }] };
  });
}

export const QUESTIONS = [
  { question: "What is total recognised revenue in AED?" },
  { question: "What is recognised revenue for Business Transformation Consulting?" },
  { question: "What is recognised revenue for AI-Enabled Business Transformation?" },
  { question: "What is recognised revenue for AI Agents for Workflow Automation?" },
  { question: "What is recognised revenue for Corporate Training Programs?" },
  { question: "What is recognised revenue for Leadership Development & Culture Transformation?" },
  { question: "What is recognised revenue for Gamification in Learning & Corporate Education?" },
  { question: "What is recognised revenue in October 2026?" },
  { question: "What is recognised revenue in November 2025?" },
  { question: "What is recognised revenue in 2026 Q1?" },
  { question: "What is recognised revenue in 2026 Q2?" },
  { question: "What is recognised revenue in 2026 Q3?" },
  { question: "What is recognised revenue in the last 6 months?" },
  { question: "Which service line has the highest recognised revenue?" },
  { question: "Which service line has the lowest recognised revenue?" },
  { question: "What is total recognised revenue from clients?" },
  { question: "Which client has the highest recognised revenue?" },
  { question: "How many clients are in the client file?" },
  { question: "How many clients are Active?" },
  { question: "What is recognised revenue from clients in Dubai?" },
  { question: "What is the total contract value in AED?" },
  { question: "What is Closed Won bookings in AED?" },
  { question: "How many deals are Closed Won?" },
  { question: "What is the open pipeline gross in AED?" },
  { question: "What is the weighted open pipeline in AED?" },
  { question: "What is Closed Lost value in AED?" },
  { question: "What is the win rate by count?" },
  { question: "What is the win rate by value?" },
  { question: "What is the Negotiation stage value in AED?" },
  { question: "What is the Proposal stage value in AED?" },
  { question: "How many open deals have win probability below 40 percent?" },
  { question: "What is the gross value of open deals below 40 percent?" },
  { question: "How many people are in the department file?" },
  { question: "What are total available hours in October 2026?" },
  { question: "What are total utilised hours in October 2026?" },
  { question: "What are total billable hours in October 2026?" },
  { question: "What is company utilisation percent?" },
  { question: "What is company billable percent?" },
  { question: "What is the headcount of Sales & BD?" },
  { question: "What is Consulting Delivery utilisation percent?" },
  { question: "What are Technology & AI billable hours?" },
  { question: "What are Finance billable hours?" },
  { question: "Which department has the highest utilisation?" },
  { question: "What is Marketing utilisation percent?" },
  { question: "What is Client Success billable percent?" },
  { question: "What was recognised revenue in 2024?" },
  { question: "What is the CEO salary?" },
  { question: "What is revenue for a service line called Underwater Basket Weaving?" }
];
