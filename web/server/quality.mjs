const KEYS = {
  "sample-data/monthly-revenue-by-service-line.csv": ["month", "service_line"],
  "sample-data/clients.csv": ["client_id"],
  "sample-data/sales-pipeline.csv": ["deal_id"],
  "sample-data/department-headcount-and-hours.csv": ["department"],
  "sample-data/kpi-targets.csv": ["metric_id"]
};

const OPEN = ["Discovery", "Qualification", "Proposal", "Negotiation"];

export function validateTable(path, table) {
  const rows = table?.rows || [];
  const keys = KEYS[path] || [];
  const checks = [];
  checks.push({ name: "row_count", pass: rows.length > 0, detail: `${rows.length} rows` });
  if (keys.length) {
    const missing = rows.filter((row) => keys.some((key) => row[key] === "" || row[key] == null)).length;
    checks.push({ name: "null_keys", pass: missing === 0, detail: missing ? `${missing} rows missing ${keys.join(" + ")}` : `${keys.join(" + ")} present on every row` });
    const seen = new Set();
    let duplicates = 0;
    for (const row of rows) {
      const id = keys.map((key) => row[key]).join("|");
      if (seen.has(id)) duplicates += 1;
      seen.add(id);
    }
    checks.push({ name: "duplicate_keys", pass: duplicates === 0, detail: duplicates ? `${duplicates} duplicate ${keys.join(" + ")} keys` : "no duplicate keys" });
  }
  const numbers = (table?.schema || []).filter((column) => column.type === "number").map((column) => column.name);
  const nullNumbers = rows.filter((row) => numbers.some((name) => row[name] === "" || row[name] == null || Number.isNaN(row[name]))).length;
  checks.push({ name: "null_numbers", pass: nullNumbers === 0, detail: nullNumbers ? `${nullNumbers} rows have an empty number` : "numeric columns are filled" });
  return { pass: checks.every((check) => check.pass), checks };
}

export function crossCheck(datasets) {
  const expected = datasets?.consistency?.rows?.[0] || {};
  const revenue = sum(datasets?.revenue?.rows, "revenue_aed");
  const clientRevenue = sum(datasets?.clients?.rows, "revenue_recognized_ttm_aed");
  const won = (datasets?.pipeline?.rows || []).filter((row) => row.stage === "Closed Won");
  const open = (datasets?.pipeline?.rows || []).filter((row) => OPEN.includes(row.stage));
  const hours = datasets?.hours?.rows || [];
  const checks = [
    check("revenue_service_lines", revenue, expected.recognised_revenue_ttm),
    check("revenue_clients", clientRevenue, expected.recognised_revenue_ttm),
    check("closed_won", sum(won, "value_aed"), expected.ttm_bookings_closed_won),
    check("open_pipeline_gross", sum(open, "value_aed"), expected.open_pipeline_gross),
    check("open_pipeline_weighted", Math.round(open.reduce((total, row) => total + Number(row.value_aed) * Number(row.win_probability_pct) / 100, 0)), expected.open_pipeline_weighted),
    check("headcount", sum(hours, "headcount"), expected.headcount_total),
    check("hours_available", sum(hours, "hours_available_oct_2026"), expected.hours_available_oct_2026),
    check("hours_utilized", sum(hours, "hours_utilized_oct_2026"), expected.hours_utilized_oct_2026),
    check("billable_hours", sum(hours, "billable_hours_oct_2026"), expected.billable_hours_oct_2026)
  ];
  return { pass: checks.every((item) => item.pass), checks };
}

function check(name, actual, expected) {
  return { name, pass: actual === expected, actual, expected, detail: `${name}: ${actual} vs ${expected}` };
}

function sum(rows, field) {
  return Math.round((rows || []).reduce((total, row) => total + (Number(row[field]) || 0), 0));
}
