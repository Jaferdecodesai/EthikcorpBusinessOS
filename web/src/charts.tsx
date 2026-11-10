import React, { useEffect, useState } from "react";

const CHART_COLORS = ["#09A5EC", "#FD7152", "#D6FD21"];

export function BarList({ caption, rows, bold }: { caption: string; rows: { id: string; label: string; value: number; href?: string; note?: string; color?: string; ink?: string }[]; bold?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const summary = rows.map((row) => `${row.label} ${row.value}`).join(", ");
  return <figure className={bold ? "bar-list bold" : "bar-list"}>
    <figcaption>{caption}</figcaption>
    <div role="img" aria-label={summary || "No values"}>{rows.map((row) => {
      const body = <><span className="bar-label">{row.label}</span><span className="bar-track" aria-hidden="true"><span style={{ width: `${Math.round((row.value / max) * 100)}%`, background: row.color || "#09a5ec" }} /></span><b>{row.value}</b></>;
      return row.href ? <a className="bar-row" href={row.href} key={row.id}>{body}</a> : <div className="bar-row" key={row.id}>{body}</div>;
    })}</div>
    <table className="sr-only"><caption>{caption}</caption><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{row.label}</th><td>{row.value}</td><td>{row.note || ""}</td></tr>)}</tbody></table>
  </figure>;
}

type ChartSpec = { id: string; type: string; title: string; sample?: boolean; unit?: string; categories?: string[]; summary?: { total: number; change: number | null; best: { name: string; value: number } | null; worst: { name: string; value: number } | null }; series: { name: string; value?: number; values?: number[]; color?: number }[] };

export function LiveChart({ spec }: { spec: ChartSpec }) {
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<{ label: string; rows: { name: string; value: number; color: string }[] } | null>(null);
  useEffect(() => { setReady(false); const frame = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(frame); }, [spec.id]);
  const summary = spec.summary;
  return <figure className={`live-chart hero-chart ${ready ? "ready" : ""}`} key={spec.id}>
    <figcaption>{spec.sample && <span className="sample-badge">SAMPLE DATA</span>} {spec.title}</figcaption>
    {summary && <div className="chart-kpis"><article className="tile sky"><span>Total</span><b><Count value={summary.total} /></b><small>{spec.unit || ""}</small></article><article className="tile lime"><span>Change</span><b>{summary.change == null ? "—" : `${summary.change > 0 ? "+" : ""}${summary.change}%`}</b><small>first to last period</small></article><article className="tile coral"><span>Best</span><b>{summary.best?.name || "—"}</b><small>{summary.best ? formatUnit(summary.best.value, spec.unit) : ""}</small></article><article className="tile sky"><span>Worst</span><b>{summary.worst?.name || "—"}</b><small>{summary.worst ? formatUnit(summary.worst.value, spec.unit) : ""}</small></article></div>}
    <div className="chart-stage" onMouseLeave={() => setTip(null)}>
      {spec.type === "line" || spec.type === "area" ? <LineChart spec={spec} onHover={setTip} /> : null}
      {spec.type === "donut" ? <Donut series={spec.series} /> : null}
      {(spec.type === "bar" || spec.type === "funnel") && <ColumnChart spec={spec} ready={ready} onHover={setTip} />}
      {tip && <div className="chart-tip" role="status"><b>{tip.label}</b>{tip.rows.map((row) => <span key={row.name}><i style={{ background: row.color }} />{row.name} {formatUnit(row.value, spec.unit)}</span>)}</div>}
    </div>
    <ul className="legend">{spec.series.filter((item) => item.name).map((item, index) => <li key={item.name}><i style={{ background: CHART_COLORS[(item.color ?? index) % 3] }} />{item.name}</li>)}</ul>
  </figure>;
}

function formatUnit(value: number, unit?: string) {
  if (unit === "%") return `${value}%`;
  if (unit === "AED") return `AED ${Math.round(value).toLocaleString("en-AE")}`;
  return Math.round(value).toLocaleString("en-AE");
}

function LineChart({ spec, onHover }: { spec: ChartSpec; onHover: (tip: { label: string; rows: { name: string; value: number; color: string }[] } | null) => void }) {
  const width = 760;
  const height = 320;
  const left = 56;
  const right = 48;
  const bottom = 36;
  const safeId = spec.id.replace(/[^a-z0-9-]/gi, "");
  const categories = spec.categories || [];
  const max = Math.max(1, ...spec.series.flatMap((item) => item.values || []));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const xAt = (point: number) => categories.length <= 1 ? left + (width - left - right) / 2 : left + (point / (categories.length - 1)) * (width - left - right);
  const yAt = (value: number) => 16 + (1 - value / max) * (height - bottom - 16);
  return <svg viewBox={`0 0 ${width} ${height}`} className="hero-plot" role="img" aria-label={spec.series.map((item) => item.name).join(", ")} onMouseMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); const ratio = (event.clientX - bounds.left) / bounds.width; const local = ratio * width; const index = categories.reduce((best, _, point) => Math.abs(xAt(point) - local) < Math.abs(xAt(best) - local) ? point : best, 0); onHover({ label: categories[index] || "", rows: spec.series.map((item, seriesIndex) => ({ name: item.name, value: item.values?.[index] || 0, color: CHART_COLORS[seriesIndex % 3] })) }); }}>
    <defs>{CHART_COLORS.map((color, index) => <linearGradient id={`fill-${safeId}-${index}`} key={color} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.45" /><stop offset="100%" stopColor={color} stopOpacity="0.02" /></linearGradient>)}</defs>
    {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - 12} y1={yAt(max * tick)} y2={yAt(max * tick)} className="plot-grid" /><text x={left - 8} y={yAt(max * tick) + 4} textAnchor="end" className="axis">{Math.round(max * tick / (spec.unit === "AED" ? 1000 : 1))}{spec.unit === "AED" ? "k" : ""}</text></g>)}
    {categories.map((category, index) => <text key={category} x={xAt(index)} y={height - 10} textAnchor="middle" className="axis">{category}</text>)}
    {spec.series.map((item, index) => {
      const values = item.values || [];
      const line = values.map((value, point) => `${point ? "L" : "M"}${xAt(point)},${yAt(value)}`).join(" ");
      const area = `${line} L${xAt(values.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`;
      return <g key={item.name}><path d={area} fill={`url(#fill-${safeId}-${index % 3})`} /><path d={line} fill="none" stroke={CHART_COLORS[index % 3]} strokeWidth="4.5" className="draw" /></g>;
    })}
  </svg>;
}

function ColumnChart({ spec, ready, onHover }: { spec: ChartSpec; ready: boolean; onHover: (tip: { label: string; rows: { name: string; value: number; color: string }[] } | null) => void }) {
  const max = Math.max(1, ...spec.series.map((item) => item.value || 0));
  return <div className="columns" role="img" aria-label={spec.title}>{spec.series.map((item, index) => <button type="button" className="column" key={item.name} onMouseEnter={() => onHover({ label: item.name, rows: [{ name: item.name, value: item.value || 0, color: CHART_COLORS[index % 3] }] })} onFocus={() => onHover({ label: item.name, rows: [{ name: item.name, value: item.value || 0, color: CHART_COLORS[index % 3] }] })}><span style={{ height: ready ? `${Math.max(4, Math.round(((item.value || 0) / max) * 100))}%` : "0%", background: CHART_COLORS[index % 3], transitionDelay: `${index * 50}ms` }} /><b>{item.name}</b></button>)}</div>;
}

function Donut({ series }: { series: { name: string; value?: number }[] }) {
  const total = series.reduce((sum, item) => sum + (item.value || 0), 0) || 1;
  let cursor = 0;
  const radius = 46;
  const turn = 2 * Math.PI * radius;
  return <svg viewBox="0 0 140 140" className="donut" role="img">{series.map((item, index) => { const length = ((item.value || 0) / total) * turn; const dash = `${length} ${turn - length}`; const node = <circle key={item.name} cx="70" cy="70" r={radius} fill="none" stroke={CHART_COLORS[index % 3]} strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-cursor} transform="rotate(-90 70 70)" className="sweep" />; cursor += length; return node; })}</svg>;
}

function Count({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(value); return; }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => { const progress = Math.min(1, (now - start) / 700); setShown(Math.round(value * progress)); if (progress < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <b>{shown.toLocaleString("en-AE")}</b>;
}
