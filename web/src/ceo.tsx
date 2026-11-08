import React, { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import { stages } from "./data";
import { BarList } from "./charts";
import { formationReport } from "../shared/guide-rules.mjs";
import { sources } from "./data";

type Summary = { id: string; name: string; short: string; code: string; stats: { open: number; blocked: number; reviews: number; runs: number }; settings: { paused: boolean; owner: string } };
type Task = { id: string; title: string; status: string; owner: string };
type Run = { id: string; name: string; status: string; mode: string };

export function CeoDesk() {
  const [summaries, setSummaries] = useState<Summary[] | null>(null);
  const [blocked, setBlocked] = useState<{ dept: string; id: string; title: string; owner: string }[]>([]);
  const [reviews, setReviews] = useState<{ dept: string; id: string; name: string; mode: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const pm = readPm();
  const report = formationReport({ stages, sources, checked: pm.checked, records: pm.records, githubReady: false });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const summary = await fetch("/api/departments").then((r) => r.json());
        const details = await Promise.all(summary.departments.map((dept: Summary) => fetch(`/api/departments/${dept.id}`).then((r) => r.json())));
        if (!live) return;
        setSummaries(summary.departments);
        const blocks: typeof blocked = [];
        const waits: typeof reviews = [];
        details.forEach((detail: { definition: { id: string }; tasks: Task[]; runs: Run[] }) => {
          detail.tasks.filter((task) => task.status === "blocked").forEach((task) => blocks.push({ dept: detail.definition.id, id: task.id, title: task.title, owner: task.owner }));
          detail.runs.filter((run) => run.status === "pending_review").forEach((run) => waits.push({ dept: detail.definition.id, id: run.id, name: run.name, mode: run.mode }));
        });
        setBlocked(blocks);
        setReviews(waits);
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "The department register could not be read."); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, []);

  const open = summaries?.reduce((n, dept) => n + dept.stats.open, 0) ?? 0;
  const blockedCount = summaries?.reduce((n, dept) => n + dept.stats.blocked, 0) ?? 0;
  const reviewCount = summaries?.reduce((n, dept) => n + dept.stats.reviews, 0) ?? 0;
  return <div>
    <div className="vh">
      <div>
        <div className="eyebrow">CEO desk · live workspace records</div>
        <h1>The company, as the records stand</h1>
        <p className="sub">This desk aggregates the nine department workspaces and the formation checklist. Counts are stored items. They are not hours saved, revenue, or a productivity claim.</p>
      </div>
      <a className="btn" href="#pm">Open the customer journey</a>
    </div>
    {error && <div className="card pad" role="alert"><b>Could not load workspaces.</b> <span>{error}</span></div>}
    <div className="grid g4" style={{ marginBottom: 16 }}>
      <Kpi label="Open work" value={loading ? "…" : String(open)} detail="Across nine departments" />
      <Kpi label="Blocked" value={loading ? "…" : String(blockedCount)} detail="Needs a person or a partner" />
      <Kpi label="Drafts awaiting review" value={loading ? "…" : String(reviewCount)} detail="A person accepts each draft" />
      <Kpi label="Formation checklist" value={`${report.completedTasks}/${report.totalTasks}`} detail="Ticks are not acceptance" />
    </div>
    <div className="grid g2" style={{ marginBottom: 16 }}>
      <section className="card pad">
        <div className="ch"><h2>Open work by department</h2><span className="pill">Workspace records</span></div>
        {summaries ? <BarList caption="Each bar is the current open-task count. Select a row to open that workspace." rows={summaries.map((dept) => ({ id: dept.id, label: dept.short || dept.name, value: dept.stats.open, href: `#departments/${dept.id}/dashboard` }))} /> : <div className="empty"><b>{loading ? "Loading records…" : "No register"}</b></div>}
      </section>
      <section className="card pad">
        <div className="ch"><h2>Decisions waiting</h2></div>
        {reviews.length ? reviews.map((item) => <a key={item.id} className="bar-row" href={`#departments/${item.dept}/reviews`}><span className="bar-label">{item.name}</span><span className="note">{item.mode === "sim" ? "Sim" : "Local template"}</span></a>) : <div className="empty"><b>No drafts awaiting review</b><span>Run a department template to create one. Nothing is invented here.</span></div>}
        <div className="ch" style={{ marginTop: 16 }}><h2>Bottlenecks</h2></div>
        {blocked.length ? blocked.map((item) => <a key={item.id} className="bar-row" href={`#departments/${item.dept}/workboard`}><span className="bar-label">{item.title}</span><span className="note">{item.owner || "Unassigned"}</span></a>) : <div className="empty"><b>No blocked tasks</b><span>When a work item is marked blocked, it appears here with its department.</span></div>}
      </section>
    </div>
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="ch pad" style={{ margin: 0 }}><h2>Department drilldown</h2><span className="note">Autonomous routines stay paused. A lead runs only when a person sends a request.</span></div>
      <div style={{ overflow: "auto" }}>
        <table className="tbl">
          <thead><tr><th>Department</th><th>Lead</th><th>Open</th><th>Blocked</th><th>Reviews</th><th>Depends on</th></tr></thead>
          <tbody>{(summaries || catalog).map((dept) => {
            const live = summaries?.find((row) => row.id === dept.id);
            const def = catalog.find((row) => row.id === dept.id)!;
            return <tr key={dept.id}><td><a href={`#departments/${dept.id}/dashboard`}>{def.name}</a></td><td>{live?.settings.owner || "Unassigned"}</td><td>{live?.stats.open ?? "…"}</td><td>{live?.stats.blocked ?? "…"}</td><td>{live?.stats.reviews ?? "…"}</td><td>{def.partners.map((id) => catalog.find((row) => row.id === id)?.short).filter(Boolean).join(", ")}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </section>
    <section className="card pad">
      <div className="ch"><h2>Formation, from the same checklist</h2><a href="#pm">Continue with the customer</a></div>
      <BarList caption="Checklist items marked in this browser. A full bar is not a signed gate." rows={report.stageProgress.map((stage: { id: string; name: string; done: number }) => ({ id: stage.id, label: stage.name, value: stage.done, href: `#pm/${stage.id}` }))} />
    </section>
  </div>;
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="card kpi"><div className="l">{label}</div><div className="v">{value}</div><div className="x">{detail}</div></article>;
}
function readPm() {
  try {
    const parsed = JSON.parse(localStorage.getItem("superbrain-pm-ethikcorp-v1") || "{}");
    return { checked: parsed.checked || {}, records: parsed.records || {} };
  } catch { return { checked: {}, records: {} }; }
}
