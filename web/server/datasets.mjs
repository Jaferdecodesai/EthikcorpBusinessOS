const OPEN = new Set(["Discovery", "Qualification", "Proposal", "Negotiation"]);

export function queryDataset(datasets, query = {}) {
  const table = datasets?.[query.dataset];
  if (!table) return { ok: false, error: `Unknown dataset ${query.dataset || ""}.`.trim(), rows: [] };
  let rows = table.rows.slice();
  if (query.lastMonths) {
    const months = [...new Set(rows.map((row) => row.month))].sort();
    const keep = new Set(months.slice(-Number(query.lastMonths)));
    rows = rows.filter((row) => keep.has(row.month));
  }
  for (const filter of query.filters || []) rows = rows.filter((row) => match(row, filter));
  if (query.groupBy) {
    const groups = new Map();
    for (const row of rows) {
      const key = String(row[query.groupBy] ?? "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    rows = [...groups.entries()].map(([key, group]) => ({ [query.groupBy]: key, value: aggregate(group, query.aggregate), count: group.length }));
  }
  if (query.sort) rows.sort((left, right) => Number(right[query.sort] || 0) - Number(left[query.sort] || 0));
  if (query.limit) rows = rows.slice(0, query.limit);
  return { ok: true, sample: true, dataset: query.dataset, rows, aggregate: query.aggregate || null };
}

function match(row, filter) {
  const value = row[filter.field];
  if (filter.op === "eq") return value === filter.value;
  if (filter.op === "in") return (filter.value || []).includes(value);
  if (filter.op === "not_in") return !(filter.value || []).includes(value);
  if (filter.op === "lt") return Number(value) < Number(filter.value);
  if (filter.op === "lte") return Number(value) <= Number(filter.value);
  return true;
}

function aggregate(rows, spec) {
  if (!spec) return rows.length;
  const numbers = rows.map((row) => Number(row[spec.field]) || 0);
  if (spec.op === "sum") return round(numbers.reduce((sum, value) => sum + value, 0));
  if (spec.op === "avg") return round(numbers.reduce((sum, value) => sum + value, 0) / (numbers.length || 1));
  return numbers.length;
}

export function sumField(rows, field) {
  return round((rows || []).reduce((sum, row) => sum + (Number(row[field]) || 0), 0));
}

export function hourlyRate(datasets) {
  const revenue = sumField(datasets?.revenue?.rows, "revenue_aed");
  const billable = sumField(datasets?.hours?.rows, "billable_hours_oct_2026");
  if (!revenue || !billable) return null;
  return revenue / 12 / billable;
}

export function analyzeRevenue(datasets) {
  if (!datasets?.revenue || !datasets?.pipeline || !datasets?.hours) return { opportunities: [], rate: null };
  const rate = hourlyRate(datasets);
  const open = datasets.pipeline.rows.filter((row) => OPEN.has(row.stage));
  const atRisk = open.filter((row) => Number(row.win_probability_pct) < 40);
  const lost = datasets.pipeline.rows.filter((row) => row.stage === "Closed Lost");
  const expected = round(open.reduce((sum, row) => sum + Number(row.value_aed) * Number(row.win_probability_pct) / 100, 0));
  const risk = round(atRisk.reduce((sum, row) => sum + Number(row.value_aed) * Number(row.win_probability_pct) / 100, 0));
  const lostTotal = sumField(lost, "value_aed");
  const nonBillable = round(datasets.hours.rows.reduce((sum, row) => sum + Math.max(0, Number(row.hours_utilized_oct_2026) - Number(row.billable_hours_oct_2026)), 0));
  const capacity = rate == null ? null : round(nonBillable * rate);
  const opportunities = [
    { id: "open-book", title: "Work the open book at the probabilities already in the file", impactAed: expected, formula: "sum(value_aed × win_probability_pct / 100) for Discovery, Qualification, Proposal and Negotiation", confidence: "Sample file probabilities", owner: "Sales & BD", sample: true },
    { id: "at-risk", title: "Stay on deals below 40% probability", impactAed: risk, formula: "sum(value_aed × win_probability_pct / 100) where the stage is open and win_probability_pct < 40", confidence: "Sample file probabilities", owner: "Sales & BD", sample: true },
    { id: "capacity", title: "Value the utilised hours that were not billable in October", impactAed: capacity, formula: "(sum(hours_utilized_oct_2026 − billable_hours_oct_2026)) × (sum(revenue_aed) / 12 / sum(billable_hours_oct_2026))", confidence: "One sample month of hours against trailing revenue", owner: "Operations", sample: true },
    { id: "lost", title: "The closed-lost book is a ceiling, not a forecast", impactAed: lostTotal, formula: "sum(value_aed) where stage = Closed Lost", confidence: "Low. This is the lost total, not an expected recovery", owner: "Sales & BD", sample: true }
  ].filter((item) => item.impactAed != null);
  return { opportunities, rate: rate == null ? null : round(rate) };
}

function round(value) {
  return Math.round(value);
}

export function buildChart(rows, options) {
  const type = options.type || "bar";
  let spec;
  if (type === "line" || type === "area") {
    const months = [...new Set(rows.map((row) => row.month_label || row.month))];
    const names = [...new Set(rows.map((row) => row.service_line || row[options.series]))];
    spec = { id: `chart-${type}-${months.join("-")}`, type, title: options.title, sample: true, unit: options.unit || "AED", categories: months, series: names.map((name, index) => ({ name, color: index % 3, values: months.map((month) => { const found = rows.find((row) => (row.month_label || row.month) === month && (row.service_line || row[options.series]) === name); return found ? Number(found.revenue_aed || found.value) || 0 : 0; }) })) };
  } else if (type === "funnel" || type === "donut" || type === "bar") {
    spec = { id: `chart-${type}-${rows.length}-${options.title}`, type, title: options.title, sample: true, unit: options.unit || "AED", series: rows.map((row) => ({ name: String(row.stage || row.service_line || row.department || row.label || ""), value: Number(row.value ?? row.value_aed ?? row.utilisation_pct) || 0 })) };
  } else if (type === "table" || type === "kpi") spec = { id: `chart-${type}-${options.title}`, type, title: options.title, sample: true, unit: options.unit || "", series: rows };
  else spec = { id: "chart-flow", type: "flow", title: options.title, sample: true, series: rows };
  spec.summary = chartSummary(spec);
  return spec;
}

export function chartSummary(spec) {
  const series = spec.series || [];
  if (series[0]?.values) {
    const totals = (spec.categories || []).map((_, index) => series.reduce((sum, item) => sum + (Number(item.values?.[index]) || 0), 0));
    const total = totals.reduce((sum, value) => sum + value, 0);
    const change = totals[0] ? Math.round(((totals[totals.length - 1] - totals[0]) / totals[0]) * 1000) / 10 : null;
    const ranked = series.map((item) => ({ name: item.name, value: (item.values || []).reduce((sum, value) => sum + value, 0) })).sort((left, right) => right.value - left.value);
    return { total: Math.round(total), change, best: ranked[0] || null, worst: ranked[ranked.length - 1] || null };
  }
  const ranked = series.map((item) => ({ name: item.name, value: Number(item.value) || 0 })).filter((item) => item.name).sort((left, right) => right.value - left.value);
  const total = Math.round(ranked.reduce((sum, item) => sum + item.value, 0));
  return { total, change: null, best: ranked[0] || null, worst: ranked[ranked.length - 1] || null };
}
