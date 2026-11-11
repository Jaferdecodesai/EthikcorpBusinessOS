import React, { useEffect, useRef, useState } from "react";
import { axisTicks, formatCompact, formatDelta, formatFull, tickLabel } from "./format";

const BLUE = "#1F5FBF";
const ORANGE = "#C25400";
const EASE = "cubic-bezier(0.2, 0, 0, 1)";

export type ChartPoint = { name: string; value?: number; values?: number[]; target?: number | null; belowTarget?: boolean; statusLabel?: string; shortName?: string };
export type ChartSpec = {
  id: string;
  type: string;
  title: string;
  sample?: boolean;
  unit?: string;
  span?: number;
  mark?: "blue" | "green";
  categories?: string[];
  target?: number | null;
  targetLabel?: string;
  total?: number;
  aria?: string;
  series: ChartPoint[];
};

export type KpiModel = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  delta?: { change: number | null; compare: string; tone: string } | null;
  target: number | null;
  pctOfTarget: number | null;
  status: "on-target" | "below-target" | "no-target" | "not-measured";
  definition?: string;
  mode?: string;
};

const MIX = ["#1F5FBF", "#2B8A5A", "#0E3A75", "#14663F", "#4C8DD6"];
const GREEN = "#2B8A5A";

function colorFor(point: ChartPoint, index: number, mix = false, mark: "blue" | "green" = "blue") {
  if (mix) return point.name === "Other" ? "#8A949E" : MIX[index % MIX.length];
  return mark === "green" ? GREEN : BLUE;
}

export function BarList({ caption, rows }: { caption: string; rows: { id: string; label: string; value: number; href?: string; note?: string }[]; bold?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <figure className="bar-list">
    <figcaption>{caption}</figcaption>
    <div role="img" aria-label={rows.map((row) => `${row.label} ${row.value}`).join(", ") || "No values"}>{rows.map((row) => {
      const body = <><span className="bar-label">{row.label}</span><span className="bar-track" aria-hidden="true"><span style={{ width: `${Math.round((row.value / max) * 100)}%`, background: BLUE }} /></span><b>{row.value}</b></>;
      return row.href ? <a className="bar-row" href={row.href} key={row.id}>{body}</a> : <div className="bar-row" key={row.id}>{body}</div>;
    })}</div>
  </figure>;
}

export function KpiTile({ kpi, onSelect }: { kpi: KpiModel; onSelect?: () => void }) {
  const measured = kpi.status !== "not-measured" && kpi.value != null;
  const compact = measured ? formatCompact(kpi.value as number, kpi.unit) : "—";
  const full = measured ? formatFull(kpi.value as number, kpi.unit) : "Not measured";
  const delta = kpi.delta ? formatDelta(kpi.delta.change, kpi.delta.compare) : "";
  const targetText = kpi.target != null ? `Target ${formatCompact(kpi.target, kpi.unit)}${kpi.pctOfTarget != null ? ` · ${kpi.pctOfTarget}%` : ""}` : "";
  const statusText = kpi.status === "below-target" ? "Below target" : kpi.status === "on-target" ? "On target" : kpi.status === "not-measured" ? "Not measured" : "";
  const described = `${kpi.label} ${full}${delta ? `, ${delta}` : ""}${targetText ? `, ${targetText}` : ""}${statusText ? `, ${statusText}` : ""}`;
  const ratio = kpi.target && kpi.value != null ? Math.max(0, Math.min(100, (kpi.value / kpi.target) * 100)) : 0;
  return <button type="button" className={`kpi-tile ${kpi.status === "below-target" ? "below" : ""}`} aria-label={described} title={full} onClick={onSelect}>
    <span className="kpi-label">{kpi.label}{kpi.definition && <span className="info" title={kpi.definition}>i</span>}</span>
    <span className="kpi-value">{compact}</span>
    {delta && <span className={`kpi-delta ${kpi.delta?.tone || "neutral"}`}>{delta}</span>}
    {targetText && <span className="kpi-target">{targetText}</span>}
    {kpi.target != null && measured && <span className="bullet-bar" aria-hidden="true"><span style={{ width: `${ratio}%`, background: kpi.status === "below-target" ? ORANGE : BLUE }} /><i /></span>}
    {kpi.status === "on-target" && <span className="badge success">✓ On target</span>}
    {kpi.status === "below-target" && <span className="badge low">▼ Below target</span>}
    {kpi.status === "not-measured" && <span className="badge neutral">Not measured</span>}
  </button>;
}

export function LiveChart({ spec }: { spec: ChartSpec }) {
  const [table, setTable] = useState(false);
  const [tip, setTip] = useState<{ title: string; lines: string[] } | null>(null);
  const summary = spec.aria || spec.title;
  const points = pointsOf(spec);
  return <figure className={`live-chart span-${spec.span || 6}`} id={spec.id}>
    <figcaption><span>{spec.title}</span>{spec.sample && <span className="badge neutral">Sample</span>}</figcaption>
    <div className="chart-stage" onMouseLeave={() => setTip(null)}>
      {spec.type === "donut" || spec.type === "pie" ? <Donut spec={spec} onHover={setTip} /> : spec.type === "column" || spec.type === "stacked_column" || spec.type === "grouped_bar" ? <Columns spec={spec} onHover={setTip} /> : <Bars spec={spec} onHover={setTip} />}
      {tip && <div className="chart-tip" role="status"><b>{tip.title}</b>{tip.lines.map((line) => <span key={line}>{line}</span>)}</div>}
    </div>
    <button type="button" className="btn ghost sm table-toggle" aria-pressed={table} onClick={() => setTable((value) => !value)}>{table ? "Hide table" : "View as table"}</button>
    {table && <table className="tbl"><caption className="sr-only">{spec.title}</caption><thead><tr><th>Category</th><th>{spec.unit || "Value"}</th></tr></thead><tbody>{points.map((point) => <tr key={point.name}><th scope="row">{point.name}</th><td>{formatFull(point.value, spec.unit)}</td></tr>)}</tbody></table>}
    <p className="sr-only">{summary}</p>
  </figure>;
}

function pointsOf(spec: ChartSpec) {
  if (spec.series.some((item) => item.values)) {
    return (spec.categories || []).map((name, index) => ({ name, value: spec.series.reduce((sum, item) => sum + (item.values?.[index] || 0), 0) }));
  }
  return spec.series.map((item) => ({ name: item.name, value: item.value || 0 }));
}

function Bars({ spec, onHover }: { spec: ChartSpec; onHover: (tip: { title: string; lines: string[] } | null) => void }) {
  const rows = spec.series.filter((item) => item.name);
  const percent = spec.unit === "%" || spec.unit === "percent";
  const max = percent ? 100 : Math.max(1, spec.target || 0, ...rows.map((row) => row.value || 0));
  const ticks = percent ? [0, 25, 50, 75, 100] : axisTicks(max);
  const top = Math.max(percent ? 100 : max, ticks[ticks.length - 1] || max);
  return <div className="hbar" role="img" aria-label={spec.aria || spec.title}>
    <div className="hbar-axis" aria-hidden="true"><span /><span className="hbar-scale">{ticks.map((tick) => <span key={tick} style={{ left: `${(tick / top) * 100}%` }}>{percent ? `${tick}%` : tickLabel(tick)}</span>)}</span><span /></div>
    {rows.map((row, index) => {
      const color = colorFor(row, index, false, spec.mark);
      const width = `${Math.max(0, Math.min(100, ((row.value || 0) / top) * 100))}%`;
      return <button type="button" className="hbar-row" data-flip={row.name} key={row.name} title={row.name} onMouseEnter={() => onHover({ title: row.name, lines: [formatFull(row.value || 0, spec.unit), row.belowTarget ? "Below target" : ""] })} onFocus={() => onHover({ title: row.name, lines: [formatFull(row.value || 0, spec.unit)] })}>
        <span className="hbar-name"><span>{row.name}</span><em className="below-label">{row.belowTarget ? (row.statusLabel || "▼ Below target") : ""}</em></span>
        <span className="hbar-plot"><span className="hbar-fill" style={{ width, background: color, transition: `width 250ms ${EASE}` }} /></span>
        <b>{formatCompact(row.value || 0, spec.unit)}</b>
      </button>;
    })}
    {!rows.length && <p className="empty-copy">No rows for this chart.</p>}
  </div>;
}

function Columns({ spec, onHover }: { spec: ChartSpec; onHover: (tip: { title: string; lines: string[] } | null) => void }) {
  const stacked = spec.type === "stacked_column" || spec.type === "grouped_bar";
  const categories = spec.categories?.length ? spec.categories : spec.series.map((item) => item.name);
  const values = categories.map((category, index) => stacked ? spec.series.reduce((sum, item) => sum + (item.values?.[index] || 0), 0) : (spec.series.find((item) => item.name === category)?.value ?? spec.series[0]?.values?.[index] ?? 0));
  const max = Math.max(1, spec.target || 0, ...values);
  let ticks = axisTicks(max);
  let top = ticks[ticks.length - 1] || max;
  if (top < max) {
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : max;
    while (top < max) top += step;
    ticks = [];
    for (let value = 0; value <= top + step / 10; value += step) ticks.push(Math.round(value));
    top = ticks[ticks.length - 1];
  }
  const targetPct = spec.target != null ? Math.max(0, Math.min(100, (spec.target / top) * 100)) : 0;
  return <div className="vbar" role="img" aria-label={spec.aria || spec.title}>
    <div className="vbar-ticks" aria-hidden="true">{[...ticks].reverse().map((tick) => <span key={tick}>{tickLabel(tick)}</span>)}</div>
    <div className="vbar-tracks">
      {spec.target != null && <div className="target-line" style={{ bottom: `${targetPct}%` }} />}
      {categories.map((category, index) => {
        const point = spec.series.find((item) => item.name === category);
        const color = BLUE;
        const height = `${Math.max(0, Math.min(100, (values[index] / top) * 100))}%`;
        return <button type="button" className="vbar-col" key={category} title={formatFull(values[index], spec.unit)} onMouseEnter={() => onHover({ title: category, lines: [formatFull(values[index], spec.unit), point?.belowTarget ? "Below target" : "On target"] })} onFocus={() => onHover({ title: category, lines: [formatFull(values[index], spec.unit)] })}>
          <i style={{ height, background: color, transition: `height 250ms ${EASE}` }}><b>{tickLabel(values[index])}</b></i>
        </button>;
      })}
    </div>
    <div className="vbar-names">{categories.map((category, index) => <em key={category} title={category}><span>{category}</span><span className="col-foot">{tickLabel(values[index])}</span></em>)}</div>
    {spec.target != null && <div className="target-rail" aria-hidden="true"><span className="target-tag" style={{ bottom: `${targetPct}%` }}>Target {formatCompact(spec.target, spec.unit)}</span></div>}
    {spec.target != null && <p className="target-note">Target {formatCompact(spec.target, spec.unit)}</p>}
  </div>;
}

const SHORT: Record<string, string> = {
  "Business Transformation Consulting": "Transformation Consulting",
  "AI-Enabled Business Transformation": "AI-Enabled Transformation",
  "Corporate Training Programs": "Corporate Training",
  "AI Agents for Workflow Automation": "AI Agents for Workflow",
  "Leadership Development & Culture Transformation": "Leadership & Culture",
  "Gamification in Learning & Corporate Education": "Gamification"
};

function Donut({ spec, onHover }: { spec: ChartSpec; onHover: (tip: { title: string; lines: string[] } | null) => void }) {
  const series = spec.series.filter((item) => (item.value || 0) > 0);
  const total = spec.total || series.reduce((sum, item) => sum + (item.value || 0), 0) || 1;
  const size = 184;
  const ring = 22;
  const radius = (size - ring) / 2;
  const turn = 2 * Math.PI * radius;
  let cursor = 0;
  const valueRef = useRef<HTMLSpanElement>(null);
  const compact = formatCompact(total, spec.unit).replace(/^AED\s*/, "");
  useEffect(() => {
    const node = valueRef.current;
    if (!node) return;
    let next = 24;
    node.style.fontSize = "24px";
    while (node.scrollWidth > 116 && next > 16) {
      next -= 2;
      node.style.fontSize = `${next}px`;
    }
  }, [compact]);
  return <div className="donut-block">
    <div className="donut-ring">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut" role="img" aria-label={spec.aria || spec.title}>
        {series.map((item, index) => {
          const length = ((item.value || 0) / total) * turn;
          const dash = `${Math.max(0, length - 2)} ${turn}`;
          const node = <circle key={item.name} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colorFor(item, index, true)} strokeWidth={ring} strokeDasharray={dash} strokeDashoffset={-cursor} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
          cursor += length;
          return node;
        })}
      </svg>
      <div className="donut-centre">
        <span className="d-cur">AED</span>
        <span className="d-val num" ref={valueRef}>{compact}</span>
        <span className="d-lab">Total revenue</span>
      </div>
    </div>
    <table className="legend-table">
      <thead><tr><th /><th>Service line</th><th>AED</th><th>Share</th></tr></thead>
      <tbody>{series.map((item, index) => <tr key={item.name} onMouseEnter={() => onHover({ title: item.name, lines: [formatFull(item.value || 0, spec.unit), `${Math.round(((item.value || 0) / total) * 100)}% of total`] })}><td><i style={{ background: colorFor(item, index, true) }} /></td><td className="legend-name" title={item.name}>{item.name}</td><td className="num">{formatCompact(item.value || 0, spec.unit).replace(/^AED\s*/, "")}</td><td className="num">{Math.round(((item.value || 0) / total) * 100)}%</td></tr>)}</tbody>
    </table>
  </div>;
}
