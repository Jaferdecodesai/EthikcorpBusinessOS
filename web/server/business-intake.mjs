import { parseCsv, splitCsv } from "./csv.mjs";

const text = (value) => typeof value === "string" && value.trim() !== "";
const number = (value) => typeof value === "number" && Number.isFinite(value);
const positive = (value) => number(value) && value >= 0;
const month = (value) => typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const percent = (value) => positive(value) && value <= 100;
const identifier = (value) => text(value) || Number.isSafeInteger(value);
export const BUSINESS_TABLES = {
  revenue: { title: "Recognised revenue", fields: { month, service_line: text, revenue_aed: number }, keys: ["month", "service_line"] },
  pipeline: { title: "Sales pipeline", fields: { deal_id: identifier, client_name: text, stage: (value) => ["Discovery","Qualification","Proposal","Negotiation","Closed Won","Closed Lost"].includes(value), value_aed: positive, win_probability_pct: percent, department: text, owner_role: text }, keys: ["deal_id"] },
  hours: { title: "Department hours", fields: { month, department: text, headcount: (value) => Number.isSafeInteger(value) && value >= 0, hours_available: positive, hours_utilised: positive, billable_hours: positive }, keys: ["month", "department"] },
  clients: { title: "Client revenue", fields: { client_id: identifier, client_name: text, service_line: text, status: text, revenue_recognized_ttm_aed: number }, keys: ["client_id"] }
};

export function businessTemplate(kind) {
  const spec = Object.hasOwn(BUSINESS_TABLES, kind) ? BUSINESS_TABLES[kind] : null;
  if (!spec) throw new Error("Unknown business table.");
  return Object.keys(spec.fields).join(",") + "\n";
}

export function parseBusinessTable(kind, bytes) {
  const template = businessTemplate(kind).trim().split(",");
  let input;
  try { input = new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim(); }
  catch { throw new Error("Upload the business table as UTF-8 CSV."); }
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  const columns = splitCsv(lines[0] || "");
  if (columns.length !== template.length || !template.every((field) => columns.includes(field))) {
    throw new Error(`Expected CSV columns: ${template.join(", ")}.`);
  }
  if (lines.length < 2 || lines.length > 10001) throw new Error("Upload a table with 1–10,000 data rows.");
  for (const [index, line] of lines.entries()) {
    if (line.trim().startsWith("#") || splitCsv(line).length !== columns.length || (line.match(/"/g) || []).length % 2) {
      throw new Error(`CSV line ${index + 1} has the wrong number of fields or unbalanced quotes.`);
    }
  }
  const table = parseCsv(lines.join("\n"));
  const spec = BUSINESS_TABLES[kind];
  const seen = new Set();
  for (const [index, row] of table.rows.entries()) {
    const bad = Object.entries(spec.fields).find(([field, valid]) => !valid(row[field]));
    if (bad) throw new Error(`CSV row ${index + 2}: invalid ${bad[0]}.`);
    if (kind === "hours" && row.billable_hours > row.hours_utilised) throw new Error(`CSV row ${index + 2}: billable hours exceed utilised hours.`);
    const key = JSON.stringify(spec.keys.map((field) => String(row[field]).toLowerCase()));
    if (seen.has(key)) throw new Error(`CSV row ${index + 2}: duplicate ${spec.keys.join(" and ")}.`);
    seen.add(key);
  }
  return { ...table, sample: false };
}

export function visibleBusinessTables(brain) {
  return brain.businessMode === "uploaded" ? brain.businessTables || {} : brain.datasets || {};
}

export function answerBusinessMetric(brain, body) {
  if (brain.businessMode !== "uploaded" || body?.area === "bots" || typeof body?.question !== "string") return null;
  const question = body.question.trim().toLowerCase();
  const datasets = visibleBusinessTables(brain);
  const money = (amount) => new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(amount);
  let table, answer;
  if (/^(?:what is (?:the )?)?(?:total |recognised )?revenue\??$/.test(question) && datasets.revenue) {
    table = datasets.revenue;
    const months = table.rows.map((row) => row.month).sort();
    answer = `${money(table.rows.reduce((total, row) => total + row.revenue_aed, 0))} recognised revenue across the uploaded periods (${months[0]} to ${months.at(-1)}).`;
  } else if (/^(?:what is (?:the )?)?weighted pipeline\??$/.test(question) && datasets.pipeline) {
    table = datasets.pipeline;
    const open = table.rows.filter((row) => !row.stage.startsWith("Closed"));
    answer = `${money(open.reduce((total, row) => total + row.value_aed * row.win_probability_pct / 100, 0))} weighted pipeline across ${open.length} open deals.`;
  } else if (/^(?:what is (?:the )?)?(?:company )?utili[sz]ation\??$/.test(question) && datasets.hours) {
    table = datasets.hours;
    const month = table.rows.map((row) => row.month).sort().at(-1);
    const hours = table.rows.filter((row) => row.month === month);
    const available = hours.reduce((total, row) => total + row.hours_available, 0);
    const utilised = hours.reduce((total, row) => total + row.hours_utilised, 0);
    answer = available ? `${(utilised / available * 100).toFixed(1)}% utilisation in ${month} (${utilised} utilised hours ÷ ${available} available hours).` : `No available hours were reported for ${month}.`;
  }
  if (!table) return null;
  return { answer, citations: [{ document: table.source, url: table.url }], steps: [{ tool: "calculate", detail: `Calculated from ${table.source}` }], llm: "calculated", sample: false };
}
