import React from "react";

export function BarList({ caption, rows, bold }: { caption: string; rows: { id: string; label: string; value: number; href?: string; note?: string; color?: string; ink?: string }[]; bold?: boolean }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const summary = rows.map((row) => `${row.label} ${row.value}`).join(", ");
  return <figure className={bold ? "bar-list bold" : "bar-list"}>
    <figcaption>{caption}</figcaption>
    <div role="img" aria-label={summary || "No values"}>{rows.map((row) => {
      const body = <><span className="bar-label">{row.label}</span><span className="bar-track" aria-hidden="true" style={row.color ? { background: row.color } : undefined}><span style={{ width: `${Math.round((row.value / max) * 100)}%`, background: row.ink }} /></span><b>{row.value}</b></>;
      return row.href ? <a className="bar-row" href={row.href} key={row.id}>{body}</a> : <div className="bar-row" key={row.id}>{body}</div>;
    })}</div>
    <table className="sr-only"><caption>{caption}</caption><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{row.label}</th><td>{row.value}</td><td>{row.note || ""}</td></tr>)}</tbody></table>
  </figure>;
}
