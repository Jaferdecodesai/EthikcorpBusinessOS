const OPEN = new Set(["Discovery", "Qualification", "Proposal", "Negotiation"]);

export function queryDataset(datasets, query = {}) {
  const table = datasets?.[query.dataset];
  if (!table) return { ok: false, error: `Unknown dataset ${query.dataset || ""}.`.trim(), rows: [], matched: 0, provenance: null };
  let rows = table.rows.slice();
  const months = [...new Set(rows.map((row) => row.month).filter(Boolean))].sort();
  if (query.lastMonths) {
    const keep = new Set(months.slice(-Number(query.lastMonths)));
    rows = rows.filter((row) => keep.has(row.month));
  }
  if (query.from) rows = rows.filter((row) => String(row.month) >= query.from);
  if (query.to) rows = rows.filter((row) => String(row.month) <= query.to);
  if (query.quarter) {
    const [year, quarter] = String(query.quarter).split("-Q");
    const start = (Number(quarter) - 1) * 3 + 1;
    const keep = new Set([0, 1, 2].map((offset) => `${year}-${String(start + offset).padStart(2, "0")}`));
    rows = rows.filter((row) => keep.has(row.month));
  }
  for (const filter of query.filters || []) rows = rows.filter((row) => match(row, filter));
  const matched = rows.length;
  if (query.ratio) {
    const value = ratioValue(rows, query.ratio);
    return pack(table, query, [{ metric: query.ratio, value }], matched);
  }
  if (query.groupBy) {
    const groups = new Map();
    for (const row of rows) {
      const key = String(row[query.groupBy] ?? "");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    rows = [...groups.entries()].map(([key, group]) => ({ [query.groupBy]: key, value: aggregate(group, query.aggregate), count: group.length }));
  }
  if (query.sort) rows.sort((left, right) => Number(right[query.sort] ?? right.value ?? 0) - Number(left[query.sort] ?? left.value ?? 0));
  if (query.limit) rows = rows.slice(0, query.limit);
  return pack(table, query, rows, matched);
}

function pack(table, query, rows, matched) {
  const filter = [query.filters?.map((item) => `${item.field} ${item.op} ${[].concat(item.value).join("|")}`).join(" and "), query.from || query.to ? `month ${query.from || ""}..${query.to || ""}` : "", query.quarter || "", query.lastMonths ? `last ${query.lastMonths} months` : "", query.groupBy ? `group by ${query.groupBy}` : "", query.aggregate ? `${query.aggregate.op}(${query.aggregate.field})` : "", query.ratio || "", query.limit ? `top ${query.limit}` : ""].filter(Boolean).join("; ") || "all rows";
  return { ok: true, sample: Boolean(table.sample), dataset: query.dataset, rows, matched, aggregate: query.aggregate || null, provenance: { file: table.source || query.dataset, rowsUsed: matched, filter, columns: table.columns || [] } };
}

function ratioValue(rows, ratio) {
  const utilized = rows.reduce((total, row) => total + (Number(row.hours_utilized_oct_2026) || 0), 0);
  const available = rows.reduce((total, row) => total + (Number(row.hours_available_oct_2026) || 0), 0);
  const billable = rows.reduce((total, row) => total + (Number(row.billable_hours_oct_2026) || 0), 0);
  if (ratio === "billable") return available ? Math.round((billable / available) * 1000) / 10 : 0;
  if (ratio === "utilisation") return available ? Math.round((utilized / available) * 1000) / 10 : 0;
  return 0;
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

const ALLOWED_CHARTS = new Set(["bar", "column", "stacked_column", "grouped_bar", "donut", "pie", "kpi", "bullet"]);

export function coerceChartType(type) {
  if (type === "line" || type === "area") return "column";
  if (type === "funnel" || type === "flow" || type === "table" || type === "sparkline") return "bar";
  return ALLOWED_CHARTS.has(type) ? type : "bar";
}

export function buildChart(rows, options) {
  const requested = options.type || "bar";
  const type = coerceChartType(requested);
  const unit = options.unit || "AED";
  const monthly = (rows || []).filter((row) => row.month || row.month_label);
  let spec;
  if ((type === "column" || type === "stacked_column" || type === "grouped_bar") && monthly.length) spec = monthlyChart(monthly, type, options, unit);
  else if (type === "kpi") spec = { id: `chart-kpi-${options.title}`, type: "kpi", title: options.title, sample: true, unit: options.unit || "", series: rows };
  else spec = categoryChart(rows || [], type === "column" ? "bar" : type, options, unit);
  spec.summary = chartSummary(spec);
  return spec;
}

function monthlyChart(rows, type, options, unit) {
  const months = [...new Set(rows.map((row) => row.month_label || row.month))];
  const names = [...new Set(rows.map((row) => row.service_line || row[options.series]).filter(Boolean))];
  if (type === "column" || names.length <= 1) {
    return { id: `chart-column-${months.join("-")}`, type: "column", title: options.title, sample: true, unit, categories: months, series: [{ name: "Revenue", values: months.map((month) => rows.filter((row) => (row.month_label || row.month) === month).reduce((sum, row) => sum + (Number(row.revenue_aed || row.value) || 0), 0)) }] };
  }
  const ranked = names.map((name) => ({ name, total: rows.filter((row) => (row.service_line || row[options.series]) === name).reduce((sum, row) => sum + (Number(row.revenue_aed || row.value) || 0), 0) })).sort((left, right) => right.total - left.total);
  const head = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const seriesNames = rest.length ? [...head.map((item) => item.name), "Other"] : head.map((item) => item.name);
  return { id: `chart-${type}-${months.join("-")}`, type: type === "grouped_bar" ? "grouped_bar" : "stacked_column", title: options.title, sample: true, unit, categories: months, series: seriesNames.map((name) => ({ name, values: months.map((month) => rows.filter((row) => (row.month_label || row.month) === month && (name === "Other" ? rest.some((item) => item.name === (row.service_line || row[options.series])) : (row.service_line || row[options.series]) === name)).reduce((sum, row) => sum + (Number(row.revenue_aed || row.value) || 0), 0)) })) };
}

function categoryChart(rows, type, options, unit) {
  const series = rows.map((row) => ({ name: String(row.stage || row.service_line || row.department || row.label || row.name || ""), value: Number(row.value ?? row.value_aed ?? row.utilisation_pct ?? row.impactAed) || 0 })).filter((item) => item.name);
  series.sort((left, right) => right.value - left.value);
  const capped = capCategories(series, type === "donut" || type === "pie" ? 6 : 10);
  const chartType = type === "pie" ? "donut" : (type === "bullet" ? "bullet" : type === "donut" ? "donut" : "bar");
  return { id: `chart-${chartType}-${capped.length}-${options.title}`, type: chartType, title: options.title, sample: true, unit, series: capped };
}

function capCategories(series, max) {
  if (series.length <= max) return series;
  const head = series.slice(0, max - 1);
  const rest = series.slice(max - 1);
  head.push({ name: "Other", value: rest.reduce((sum, item) => sum + item.value, 0) });
  return head;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthName(month) {
  const [year, mon] = String(month || "").split("-");
  return `${MONTHS[Number(mon) - 1] || month} ${year || ""}`.trim();
}

function periodLabel(list) {
  if (!list.length) return "No period";
  if (list.length === 1) return monthName(list[0]);
  return `${monthName(list[0])}–${monthName(list[list.length - 1])}`;
}

export function projectModel(datasets) {
  const revenueRows = datasets?.revenue?.rows || [];
  const hourRows = datasets?.hours?.rows || [];
  const pipelineRows = datasets?.pipeline?.rows || [];
  const targetRows = datasets?.targets?.rows || [];
  const openStages = ["Discovery", "Qualification", "Proposal", "Negotiation"];
  const won = pipelineRows.filter((row) => row.stage === "Closed Won");
  const lost = pipelineRows.filter((row) => row.stage === "Closed Lost");
  const open = pipelineRows.filter((row) => openStages.includes(row.stage));
  const stages = new Map();
  const risk = new Map();
  for (const row of pipelineRows) stages.set(row.stage, (stages.get(row.stage) || 0) + (Number(row.value_aed) || 0));
  for (const row of open.filter((item) => Number(item.win_probability_pct) < 40)) risk.set(row.stage, (risk.get(row.stage) || 0) + (Number(row.value_aed) || 0));
  const closedValue = won.reduce((sum, row) => sum + Number(row.value_aed), 0) + lost.reduce((sum, row) => sum + Number(row.value_aed), 0);
  return {
    ready: revenueRows.length > 0,
    revenue: revenueRows.map((row) => ({ month: row.month, label: row.month_label || monthName(row.month), line: row.service_line, value: Number(row.revenue_aed) || 0 })),
    hours: hourRows.map((row) => ({ department: row.department, hours: Number(row.hours_utilized_oct_2026) || 0, available: Number(row.hours_available_oct_2026) || 0, billable: Number(row.billable_hours_oct_2026) || 0 })),
    stages: [...stages.entries()].map(([name, value]) => ({ name, value: Math.round(value) })),
    risk: [...risk.entries()].map(([name, value]) => ({ name, value: Math.round(value) })),
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 1000) / 10 : null,
    winRateValue: closedValue ? Math.round((won.reduce((sum, row) => sum + Number(row.value_aed), 0) / closedValue) * 1000) / 10 : null,
    weighted: Math.round(open.reduce((sum, row) => sum + Number(row.value_aed) * Number(row.win_probability_pct) / 100, 0)),
    targets: targetRows.map((row) => ({ metric: row.metric, subject: row.subject, value: Number(row.target_value), unit: row.unit, goodDirection: row.good_direction || "up" }))
  };
}

function findTarget(model, metric, subject) {
  const found = (model.targets || []).find((row) => row.metric === metric && row.subject === subject);
  return found ? found.value : null;
}

export function buildOverview(model, options = {}) {
  if (!model?.ready) return { ready: false, kpis: [], charts: [], periods: [], currency: "AED" };
  const months = [...new Set(model.revenue.map((row) => row.month))].filter(Boolean).sort();
  const periods = [
    { id: "last-6", months: months.slice(-6) },
    { id: "ttm", months },
    { id: "2026-10", months: months.filter((month) => month === "2026-10") },
    { id: "2026-q3", months: months.filter((month) => month >= "2026-07" && month <= "2026-09") }
  ].filter((item) => item.months.length).map((item) => ({ ...item, label: periodLabel(item.months) }));
  const period = periods.find((item) => item.id === options.period) || periods[0];
  const rows = model.revenue.filter((row) => period.months.includes(row.month));
  const mode = options.mode || "revenue";
  return { ready: true, period: period.id, periodLabel: period.label, periods: periods.map(({ id, label }) => ({ id, label })), mode, currency: "AED", sample: true, kpis: overviewKpis(model, rows, period), charts: overviewCharts(model, rows, period, mode, options.actions || []) };
}

function overviewKpis(model, rows, period) {
  const total = Math.round(rows.reduce((sum, row) => sum + row.value, 0));
  const byMonth = period.months.map((month) => Math.round(rows.filter((row) => row.month === month).reduce((sum, row) => sum + row.value, 0)));
  const change = byMonth[0] ? Math.round(((byMonth[byMonth.length - 1] - byMonth[0]) / byMonth[0]) * 1000) / 10 : null;
  const revenueTarget = period.id === "last-6" ? findTarget(model, "revenue", "Company") : (findTarget(model, "monthly_revenue", "Company") || 0) * (period.months.length || 1) || null;
  const available = model.hours.reduce((sum, row) => sum + row.available, 0);
  const utilised = model.hours.reduce((sum, row) => sum + row.hours, 0);
  const utilisation = available ? Math.round((utilised / available) * 1000) / 10 : null;
  return [
    kpiTile("revenue", "Revenue", total, "AED", change, monthName(period.months[0]), revenueTarget, "revenue", "Recognised revenue in the selected period."),
    kpiTile("utilisation", "Utilisation", utilisation, "%", null, "October 2026", findTarget(model, "utilisation_pct", "Company"), "utilisation", "Utilised hours divided by available hours for October 2026."),
    kpiTile("pipeline", "Weighted pipeline", model.weighted, "AED", null, "", findTarget(model, "weighted_pipeline", "Company"), "pipeline", "Open pipeline value times the win probability already in the file."),
    kpiTile("win-rate", "Win rate", model.winRate, "%", null, "", findTarget(model, "win_rate_count", "Company"), "pipeline", "Closed won deals divided by closed won and closed lost deals.")
  ];
}

function kpiTile(id, label, value, unit, change, compare, target, mode, definition) {
  const measured = value != null && !Number.isNaN(Number(value));
  const numericTarget = target == null ? null : Number(target);
  const below = measured && numericTarget != null && Number(value) < numericTarget;
  const status = !measured ? "not-measured" : numericTarget == null ? "no-target" : below ? "below-target" : "on-target";
  const pct = measured && numericTarget ? Math.round((Number(value) / numericTarget) * 100) : null;
  const delta = !measured ? null : { change, compare: compare || "", tone: status === "below-target" ? "low" : change > 0 ? "good" : "neutral" };
  return { id, label, value: measured ? Number(value) : null, unit, delta, target: numericTarget, pctOfTarget: pct, status, mode, definition };
}

function overviewCharts(model, rows, period, mode, actions) {
  const lineSeries = capCategories([...new Map(rows.map((row) => [row.line, 0])).keys()].map((name) => {
    const value = Math.round(rows.filter((row) => row.line === name).reduce((sum, row) => sum + row.value, 0));
    const monthly = findTarget(model, "monthly_revenue", name);
    const target = monthly == null ? null : monthly * period.months.length;
    return { name, value, target, belowTarget: target != null && value < target };
  }).sort((left, right) => right.value - left.value), 10);
  const monthTarget = findTarget(model, "monthly_revenue", "Company");
  const monthSeries = period.months.map((month) => {
    const value = Math.round(rows.filter((row) => row.month === month).reduce((sum, row) => sum + row.value, 0));
    const full = rows.find((row) => row.month === month)?.label || monthName(month);
    return { name: full.slice(0, 3), value, belowTarget: monthTarget != null && value < monthTarget };
  });
  const lines = chartSpec("chart-revenue-lines", "bar", `Revenue by service line, ${period.label}`, "AED", lineSeries, 6);
  const columns = { ...chartSpec("chart-revenue-months", "column", `Revenue by month, ${period.label}`, "AED", monthSeries, 6), target: monthTarget, targetLabel: monthTarget == null ? "" : "Target" };
  if (mode === "utilisation") {
    const series = model.hours.map((row) => {
      const value = row.available ? Math.round((row.hours / row.available) * 1000) / 10 : 0;
      const target = findTarget(model, "utilisation_pct", row.department);
      return { name: row.department, value, target, belowTarget: target != null && value < target };
    }).sort((left, right) => right.value - left.value);
    return [chartSpec("chart-utilisation", "bar", "Utilisation by department, October 2026", "%", series, 12)];
  }
  if (mode === "pipeline") return [chartSpec("chart-pipeline", "bar", "Pipeline by stage", "AED", capCategories(model.stages.map((row) => ({ name: row.name, value: row.value, belowTarget: false })).sort((left, right) => right.value - left.value), 10), 12)];
  if (mode === "risk") return [chartSpec("chart-risk", "bar", "Open pipeline below 40% probability", "AED", model.risk.map((row) => ({ name: row.name, value: row.value, belowTarget: false })), 12)];
  if (mode === "actions") return [chartSpec("chart-actions", "bar", "Revenue actions", "AED", actions.slice(0, 5).map((item) => ({ name: item.title, value: item.impactAed || 0, belowTarget: false })), 12)];
  if (mode === "donut") {
    const slices = lineSeries.length > 5 ? [...lineSeries.slice(0, 5), { name: "Other", value: lineSeries.slice(5).reduce((sum, item) => sum + item.value, 0), belowTarget: false }] : lineSeries;
    return [{ ...chartSpec("chart-revenue-share", "donut", `Share of revenue, ${period.label}`, "AED", slices, 6), total: lineSeries.reduce((sum, item) => sum + item.value, 0) }, columns];
  }
  return [lines, columns];
}

function chartSpec(id, type, title, unit, series, span) {
  const top = series[0];
  return { id, type, title, unit, sample: true, span, series, aria: top ? `${title}. Highest: ${top.name} ${top.value} ${unit}.` : `${title}. No rows.` };
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
