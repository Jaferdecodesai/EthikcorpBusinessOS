import React from "react";
import { sources } from "./data";

const planes = [
  ["Front-end hosting", "Global Cloudflare preview. This hostname is not a processing region."],
  ["Object storage", "Not provisioned. No company files are stored for the brain."],
  ["Database and backups", "Not provisioned. No UAE PostgreSQL backup has been tested."],
  ["Logs and traces", "Worker logs are disabled by default. No UAE log store is configured."],
  ["Embeddings", "Not configured. Uploading a file does not create vectors."],
  ["Inference", "Not configured. Local templates do not call a model."],
  ["Vendor egress", "Closed. RUNTIME_EGRESS_APPROVED stays false unless an operator sets it."],
  ["Speech", "Browser speech is optional and not sovereign. The UAE speech adapter is disconnected."]
];

export function KnowledgeAdmin({ records }: { records: Record<string, { status?: string; owner?: string; locator?: string; approvalRef?: string }> }) {
  const rows = sources.map((source) => ({ ...source, record: records[source.id] || {} }));
  const named = rows.filter((row) => row.record.owner).length;
  return <div>
    <div className="vh">
      <div>
        <div className="eyebrow">Knowledge administration</div>
        <h1>Source register and data-plane readiness</h1>
        <p className="sub">Eighteen catalogue categories. Intake status is not an index. UAE sovereignty is a requirement for company records and is unmet until each plane below is verified.</p>
      </div>
      <a className="btn" href="#pm/collection">Open collection</a>
    </div>
    <div className="grid g4" style={{ marginBottom: 16 }}>
      <article className="card kpi"><div className="l">Categories</div><div className="v">18</div><div className="x">Catalogue, not ingested files</div></article>
      <article className="card kpi"><div className="l">Named owners</div><div className="v">{named}</div><div className="x">From this browser’s plan</div></article>
      <article className="card kpi"><div className="l">Vector index</div><div className="v">0</div><div className="x">Not connected</div></article>
      <article className="card kpi"><div className="l">Fine-tune</div><div className="v">Off</div><div className="x">Not warranted, not started</div></article>
    </div>
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="ch pad" style={{ margin: 0 }}><h2>Register</h2><span className="pill a">No company corpus loaded</span></div>
      <div style={{ overflow: "auto" }}>
        <table className="tbl">
          <thead><tr><th>Source</th><th>Class</th><th>Owner</th><th>Intake</th><th>Permission</th><th>Index</th></tr></thead>
          <tbody>{rows.map((row) => {
            const uploadable = ["profile", "policies", "sops", "tasks", "marketing"].includes(row.id) && row.record.status !== "excluded";
            return <tr key={row.id}>
              <td>{row.title}</td>
              <td><span className={`pill ${row.sensitivity.startsWith("Restricted") ? "r" : row.sensitivity.startsWith("Confidential") ? "a" : "b"}`}>{row.sensitivity}</span></td>
              <td>{row.record.owner || "Unassigned"}</td>
              <td>{(row.record.status || "not-started").replace("-", " ")}</td>
              <td>{uploadable ? "Upload after approval" : "Metadata only"}</td>
              <td>Not connected</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    <section className="card pad dark-panel" style={{ marginBottom: 16 }}>
      <div className="eyebrow">UAE data plane</div>
      <h2>Required, and not verified</h2>
      <p>Offline operation is not required. Company-brain processing, storage, backups, logs, embeddings and inference must be showable inside an approved UAE or customer boundary. Selecting a label here does not create that boundary.</p>
    </section>
    <div className="resgrid">
      {planes.map(([title, detail]) => <article className="res on" key={title}><b>{title}</b><span className="pill a">Not verified</span><p className="note">{detail}</p></article>)}
    </div>
  </div>;
}
