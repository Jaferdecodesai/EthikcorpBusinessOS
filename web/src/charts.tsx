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

export function LiveChart({ spec }: { spec: { id: string; type: string; title: string; sample?: boolean; unit?: string; categories?: string[]; series: { name: string; value?: number; values?: number[]; color?: number }[] } }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(false); const frame = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(frame); }, [spec.id]);
  const max = Math.max(1, ...spec.series.map((item) => item.value || Math.max(0, ...(item.values || []))));
  return <figure className={`live-chart ${ready ? "ready" : ""}`} key={spec.id}>
    <figcaption>{spec.sample && <span className="sample-badge">SAMPLE DATA</span>} {spec.title}</figcaption>
    {spec.type === "line" || spec.type === "area" ? <LineChart spec={spec} /> : null}
    {spec.type === "donut" ? <Donut series={spec.series} /> : null}
    {spec.type === "flow" ? <div className="flow">{spec.series.map((item, index) => <span key={item.name} style={{ animationDelay: `${index * 70}ms` }}>{item.name}</span>)} </div> : null}
    {(spec.type === "bar" || spec.type === "funnel") && <div className="live-bars">{spec.series.map((item, index) => <div className="live-bar" key={item.name}><b>{item.name}</b><i><em style={{ width: ready ? `${Math.round(((item.value || 0) / max) * 100)}%` : "0%", background: CHART_COLORS[index % 3], transitionDelay: `${index * 60}ms` }} /></i><strong>{item.value}{spec.unit === "%" ? "%" : ""}</strong></div>)}</div>}
    {spec.type === "kpi" && <div className="live-kpis">{spec.series.map((item) => <article key={item.name}><Count value={item.value || 0} /><small>{item.name}</small></article>)}</div>}
    {spec.type === "table" && <table className="tbl"><tbody>{spec.series.map((item) => <tr key={item.name}><th>{item.name}</th><td>{item.value}</td></tr>)}</tbody></table>}
  </figure>;
}

function LineChart({ spec }: { spec: { categories?: string[]; series: { name: string; values?: number[] }[] } }) {
  const width = 640;
  const height = 180;
  const categories = spec.categories || [];
  const max = Math.max(1, ...spec.series.flatMap((item) => item.values || []));
  return <svg viewBox={`0 0 ${width} ${height}`} className="trend" role="img" aria-label={spec.series.map((item) => item.name).join(", ")}>{spec.series.map((item, index) => {
    const values = item.values || [];
    const d = values.map((value, point) => { const x = categories.length <= 1 ? width / 2 : (point / (categories.length - 1)) * (width - 24) + 12; const y = height - 18 - (value / max) * (height - 36); return `${point ? "L" : "M"}${x},${y}`; }).join(" ");
    return <path key={item.name} d={d} fill="none" stroke={CHART_COLORS[index % 3]} strokeWidth="3" className="draw" />;
  })}</svg>;
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
