import React, { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import {
  STEPS, STATUS_LABEL, applyCustomerSave, applyTeamUpdate, customerView, hashFor, overall, parseHash, sampleAnswer, showIndicator
} from "../shared/build-steps.mjs";
import { useDemo, type DemoState, type FileRow, type SourceRow, type StepRecord } from "./demo-state";
import { cloudPreview } from "./hosting";

const METRICS: Record<string, [string, string, string][]> = {
  sales: [["Open proposals", "12", "Sample pipeline"], ["Drafts awaiting a person", "4", "Not sent"], ["Win rate", "—", "Not calculated"]],
  marketing: [["Approved claims", "6", "Sample register"], ["Drafts in review", "2", "Not published"], ["Enquiries", "—", "No attribution"]],
  delivery: [["Active programmes", "3", "Sample engagements"], ["Milestones this month", "5", "Counted items"], ["Evaluation coverage", "1 of 3", "Not a quality score"]],
  technology: [["Assessments open", "2", "Sample"], ["Tools connected", "0", "None live"], ["Release gates", "Not passed", "No agent is running"]],
  finance: [["Invoices to prepare", "3", "Not posted"], ["Uncategorised", "7", "Sample queue"], ["Ledger", "Untouched", "Source system stays in charge"]],
  hr: [["Roles in draft", "2", "No candidate data"], ["Onboarding plans", "1", "Sample"], ["Personal records", "Excluded", "Not in the brain"]],
  operations: [["Open actions", "8", "Sample register"], ["With owner and date", "6", "Two lack a date"], ["Overdue", "1", "Sample"]],
  "client-success": [["Check-ins due", "3", "Sample accounts"], ["Evidence packs", "1", "Draft"], ["Renewals", "—", "Not a forecast"]],
  legal: [["Reviews open", "2", "Issue lists only"], ["Permissions recorded", "4", "Sample"], ["Legal conclusions", "None", "A reviewer decides"]]
};

function customerStatus(record: StepRecord) {
  if (showIndicator(record)) return "Needs you";
  if (record.status === "in_progress") return "With Aqion";
  return STATUS_LABEL[record.status];
}

function departmentName(id: string) {
  return catalog.find((item) => item.id === id)?.name || "Department";
}

export function ProductApp({ hash }: { hash: string }) {
  const route = parseHash(hash || "#pm");
  const demo = useDemo();
  const picture = overall(demo.state.steps);
  const title = route.tab === "pm" ? "Superbrain PM" : route.tab === "builder" ? "Superbrain Builder" : route.tab === "admin" ? "AqionBrain admin" : route.role === "department" ? departmentName(route.dept) : route.tab === "bots" ? "Superbots" : "Superbrain CEO";
  return <div className="portal">
    <aside className="side" aria-label="Portal">
      <a className="brand" href={hashFor(route)}><span className="mark">AQ</span><span><b>{route.phase === 1 && route.role === "customer" ? "Superbrain PM" : "Aqion Superbrain"}</b><small>{route.phase === 1 ? "Phase 1 · building" : "Phase 2 · live preview"}</small></span></a>
      <Sidebar route={route} state={demo.state} />
      <div className="sidefoot">Sample data stays in this browser. <button type="button" className="nav" onClick={demo.reset}>Reset sample</button></div>
    </aside>
    <div className="maincol">
      <header className="topbar">
        <div className="ctx"><span>Aqion Superbrain</span><span aria-hidden="true">/</span><b>{title}</b></div>
        <Switcher route={route} />
      </header>
      <div className="page">
        <div className="hosting-notice" role="note"><strong>Sample preview.</strong><span>Harbour Learning is not a client. Figures are mocked. {cloudPreview ? "This Cloudflare preview is not the company data plane. UAE processing is not configured." : "Nothing is sent to a model or a customer."}</span></div>
        {route.tab === "pm" && <CustomerPm routeStep={route.step} state={demo.state} setState={demo.setState} picture={picture} />}
        {route.tab === "builder" && <Builder stepId={route.step} state={demo.state} setState={demo.setState} />}
        {route.phase === 1 && route.tab === "ceo" && <TeamCeo state={demo.state} />}
        {route.phase === 1 && route.tab === "bots" && <TeamBots deptId={route.dept} state={demo.state} setState={demo.setState} />}
        {route.phase === 2 && route.role === "ceo" && route.tab === "brain" && <CeoBrain state={demo.state} />}
        {route.phase === 2 && route.role === "ceo" && route.tab === "bots" && <CeoBots deptId={route.dept} state={demo.state} setState={demo.setState} />}
        {route.role === "department" && <DepartmentPortal deptId={route.dept} state={demo.state} setState={demo.setState} />}
        {route.role === "admin" && <AdminPortal state={demo.state} setState={demo.setState} />}
      </div>
    </div>
  </div>;
}

function Sidebar({ route, state }: { route: ReturnType<typeof parseHash>; state: DemoState }) {
  if (route.phase === 1 && route.role === "customer") {
    return <nav aria-label="Build steps">
      <div className="navlabel">Build steps</div>
      <a className={route.step === "overview" ? "nav on" : "nav"} href="#pm" aria-current={route.step === "overview" ? "page" : undefined}>Build status</a>
      {STEPS.map((step) => {
        const record = state.steps.find((item) => item.id === step.id);
        const needs = record ? showIndicator(record) : false;
        const on = route.step === step.id;
        return <a key={step.id} className={on ? "nav on" : "nav"} href={`#pm/${step.id}`} aria-current={on ? "page" : undefined}><span className="num">{step.n}</span><span>{step.name}</span>{needs && <span className="count need">Needs you</span>}</a>;
      })}
    </nav>;
  }
  if (route.phase === 1) {
    return <nav aria-label="Aqion team">
      <div className="navlabel">Aqion team</div>
      <a className={route.tab === "builder" ? "nav on" : "nav"} href="#team/builder/discovery">Superbrain Builder</a>
      <a className={route.tab === "ceo" ? "nav on" : "nav"} href="#team/ceo">Superbrain CEO view</a>
      <a className={route.tab === "bots" ? "nav on" : "nav"} href="#team/bots/sales">Superbots Department</a>
    </nav>;
  }
  if (route.role === "ceo") {
    return <nav aria-label="CEO">
      <div className="navlabel">CEO</div>
      <a className={route.tab === "brain" ? "nav on" : "nav"} href="#live/ceo">Brain and dashboards</a>
      <a className={route.tab === "bots" ? "nav on" : "nav"} href="#live/ceo/bots">Superbots</a>
    </nav>;
  }
  if (route.role === "department") {
    return <nav aria-label="Departments">{catalog.map((item) => <a key={item.id} className={route.dept === item.id ? "nav on" : "nav"} href={`#live/dept/${item.id}`}>{item.short}<span className="count">{item.code}</span></a>)}</nav>;
  }
  return <nav aria-label="Admin"><div className="navlabel">Aqion team</div><a className="nav on" href="#live/admin">Brain configuration</a></nav>;
}

function Switcher({ route }: { route: ReturnType<typeof parseHash> }) {
  const role = route.phase === 1 ? route.role : route.role;
  return <div className="switcher">
    <label>Phase<select aria-label="Phase" value={String(route.phase)} onChange={(event) => { window.location.hash = event.target.value === "2" ? "#live/ceo" : "#pm"; }}><option value="1">1 · Building</option><option value="2">2 · Live</option></select></label>
    <label>Role<select aria-label="Role" value={role} onChange={(event) => {
      const next = event.target.value;
      window.location.hash = next === "customer" ? "#pm" : next === "team" ? "#team/builder/discovery" : next === "ceo" ? "#live/ceo" : next === "department" ? "#live/dept/sales" : "#live/admin";
    }}>{route.phase === 1 ? <><option value="customer">Customer</option><option value="team">Aqion team</option></> : <><option value="ceo">CEO</option><option value="department">Department team</option><option value="admin">Aqion admin</option></>}</select></label>
    {(route.role === "department" || route.tab === "bots") && <label>Department<select aria-label="Department" value={route.dept || "sales"} onChange={(event) => {
      const id = event.target.value;
      window.location.hash = route.phase === 1 ? `#team/bots/${id}` : route.role === "department" ? `#live/dept/${id}` : `#live/ceo/bots/${id}`;
    }}>{catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
  </div>;
}

function CustomerPm({ routeStep, state, setState, picture }: { routeStep: string; state: DemoState; setState: (value: DemoState | ((prev: DemoState) => DemoState)) => void; picture: ReturnType<typeof overall> }) {
  const step = STEPS.find((item) => item.id === routeStep);
  const record = state.steps.find((item) => item.id === routeStep);
  if (!step || !record || routeStep === "overview") {
    return <>
      <div className="vh"><div><div className="eyebrow">Superbrain PM · Phase 1</div><h1>Where the build stands</h1><p className="sub">Nine steps, in order. You fill in the first two. Aqion runs the rest. A red “Needs you” mark is the only thing waiting on you.</p></div></div>
      <div className="grid g3">
        <article className="card kpi pad"><div className="l">Steps done</div><div className="v">{picture.done} of {picture.total}</div><div className="x">A done step is not a signed acceptance</div></article>
        <article className="card kpi pad"><div className="l">Overall progress</div><div className="v">{picture.percent}%</div><div className="meter" role="progressbar" aria-valuenow={picture.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${picture.percent}%` }} /></div></article>
        <article className="card kpi pad"><div className="l">Waiting on you</div><div className="v">{picture.attention.length}</div><div className="x">{picture.attention.length ? "Open the marked step" : "Nothing needed right now"}</div></article>
      </div>
      {picture.attention.length > 0 && <div className="banner-need" role="status"><strong>Needs you. </strong>{picture.attention.map((id) => STEPS.find((item) => item.id === id)?.name).filter(Boolean).join(", ")}</div>}
      <section className="card pad" aria-label="Checklist"><div className="ch"><h2>Checklist</h2></div>
        {STEPS.map((item) => {
          const row = state.steps.find((entry) => entry.id === item.id)!;
          return <a className="checkrow" key={item.id} href={`#pm/${item.id}`}><span className="num">{item.n}</span><span><b>{item.name}</b><small>{item.customerInput ? "Your step" : "Aqion"}</small></span><span className={showIndicator(row) ? "flag" : "note"}>{customerStatus(row)}</span></a>;
        })}
      </section>
    </>;
  }
  const view = customerView(step, record);
  return <>
    <div className="vh"><div><div className="eyebrow">Step {step.n} of 9</div><h1>{step.name}</h1><p className="sub">{record.summary}</p></div><a className="btn ghost" href="#pm">Back to status</a></div>
    {view.indicator && <div className="banner-need" role="status"><strong>Needs you. </strong>The Aqion team is waiting on this step.</div>}
    <div className="grid g2">
      <article className="card kpi pad"><div className="l">Status</div><div className="v" style={{ fontSize: 22 }}>{customerStatus(record)}</div><div className="x">{view.readOnly ? "Read only" : view.editable ? "You can edit this" : "Submitted"}</div></article>
      <article className="card kpi pad"><div className="l">Progress</div><div className="v">{view.progress}%</div><div className="meter" role="progressbar" aria-valuenow={view.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${view.progress}%` }} /></div></article>
    </div>
    {view.readOnly && <section className="card pad"><div className="ch"><h2>What Aqion is doing</h2></div><p>{step.doing}</p><p className="note">This step has no customer form. If something is needed from you, it shows as “Needs you”.</p></section>}
    {step.id === "discovery" && <SourceForm rows={state.sources} locked={!view.editable} onSave={(sources) => setState((prev) => ({ ...prev, sources, steps: prev.steps.map((item) => item.id === step.id ? applyCustomerSave(item) : item) }))} />}
    {step.id === "collection" && <FileForm rows={state.files} locked={!view.editable} onSave={(files) => setState((prev) => ({ ...prev, files, steps: prev.steps.map((item) => item.id === step.id ? applyCustomerSave(item) : item) }))} />}
  </>;
}

function SourceForm({ rows, locked, onSave }: { rows: SourceRow[]; locked: boolean; onSave: (rows: SourceRow[]) => void }) {
  const [draft, setDraft] = useState(rows);
  const [saved, setSaved] = useState("");
  useEffect(() => setDraft(rows), [rows]);
  return <section className="card pad"><div className="ch"><h2>Your sources</h2></div><p className="note">Name the owner and whether the source is in, context only, or excluded. Keep the list short.</p>
    {draft.map((row, index) => <div className="rowform" key={index}>
      <input aria-label="Source" value={row.category} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, category: event.target.value } : item))} />
      <input aria-label="Owner" value={row.owner} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, owner: event.target.value } : item))} />
      <select aria-label="Decision" value={row.decision} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, decision: event.target.value as SourceRow["decision"] } : item))}><option value="authoritative">In</option><option value="context">Context only</option><option value="excluded">Excluded</option></select>
    </div>)}
    {!locked && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="btn ghost" onClick={() => setDraft([...draft, { category: "", owner: "", decision: "authoritative" }])}>Add a source</button><button type="button" className="btn" onClick={() => { onSave(draft.filter((row) => row.category.trim())); setSaved("Saved in this browser. The red mark clears when this was the open ask."); }}>Save</button></div>}
    {locked && <p className="note">This step is marked done. The Aqion team can reopen it from the builder.</p>}
    {saved && <p role="status">{saved}</p>}
  </section>;
}

function FileForm({ rows, locked, onSave }: { rows: FileRow[]; locked: boolean; onSave: (rows: FileRow[]) => void }) {
  const [draft, setDraft] = useState(rows);
  const [saved, setSaved] = useState("");
  useEffect(() => setDraft(rows), [rows]);
  return <section className="card pad"><div className="ch"><h2>Approved files</h2></div><p className="note">Public and internal files only. Confidential and personal files stay in the source system.</p>
    {draft.map((row, index) => <div className="rowform four" key={index}>
      <input aria-label="File name" value={row.name} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
      <input aria-label="File owner" value={row.owner} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, owner: event.target.value } : item))} />
      <select aria-label="Classification" value={row.classification} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, classification: event.target.value as FileRow["classification"] } : item))}><option>Public</option><option>Internal</option></select>
      <input aria-label="Original location" value={row.location} disabled={locked} onChange={(event) => setDraft(draft.map((item, i) => i === index ? { ...item, location: event.target.value } : item))} />
    </div>)}
    {!locked && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="btn ghost" onClick={() => setDraft([...draft, { name: "", owner: "", classification: "Internal", location: "" }])}>Add a file</button><button type="button" className="btn" onClick={() => { onSave(draft.filter((row) => row.name.trim())); setSaved("Saved in this browser. Nothing was uploaded."); }}>Save</button></div>}
    {saved && <p role="status">{saved}</p>}
  </section>;
}

function Builder({ stepId, state, setState }: { stepId: string; state: DemoState; setState: (value: DemoState | ((prev: DemoState) => DemoState)) => void }) {
  const selected = STEPS.some((step) => step.id === stepId) ? stepId : "discovery";
  const record = state.steps.find((item) => item.id === selected)!;
  const step = STEPS.find((item) => item.id === selected)!;
  function patch(patchValue: Partial<StepRecord>) {
    setState((prev) => ({ ...prev, steps: prev.steps.map((item) => item.id === selected ? applyTeamUpdate(item, patchValue) : item) }));
  }
  return <div className="worksplit">
    <section className="card pad" aria-label="Steps">{STEPS.map((item) => {
      const row = state.steps.find((entry) => entry.id === item.id)!;
      return <a key={item.id} className="checkrow" href={`#team/builder/${item.id}`}><span className="num">{item.n}</span><span><b>{item.teamName}</b></span>{showIndicator(row) ? <span className="flag">Ask</span> : <span className="note">{STATUS_LABEL[row.status]}</span>}</a>;
    })}</section>
    <section className="card pad">
      <div className="eyebrow">Step {step.n}</div>
      <h2>{step.teamName}</h2>
      <p className="note">{step.doing}</p>
      <div className="stack">
        <label>Status<select aria-label="Step status" value={record.status} onChange={(event) => patch({ status: event.target.value as StepRecord["status"] })}>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Progress ({record.progress}%)<input aria-label="Progress" type="range" min={0} max={100} value={record.progress} onChange={(event) => patch({ progress: Number(event.target.value) })} /></label>
        <label>Customer summary<textarea aria-label="Customer summary" rows={4} value={record.summary} onChange={(event) => patch({ summary: event.target.value })} /></label>
        <label><input type="checkbox" checked={record.needsInput} onChange={(event) => patch({ needsInput: event.target.checked })} /> Needs customer input</label>
      </div>
      <p className="note">Checking this sets the customer’s red “Needs you” mark. Marking the step done clears it.</p>
      {step.customerInput && <div><h3>What the customer saved</h3>{step.id === "discovery" ? <ul>{state.sources.map((row) => <li key={row.category}>{row.category} · {row.owner || "No owner"} · {row.decision}</li>)}{state.sources.length === 0 && <li>No sources saved.</li>}</ul> : <ul>{state.files.map((row) => <li key={row.name}>{row.name} · {row.classification} · {row.location || "No location"}</li>)}{state.files.length === 0 && <li>No files saved.</li>}</ul>}</div>}
    </section>
  </div>;
}

function TeamCeo({ state }: { state: DemoState }) {
  const picture = overall(state.steps);
  return <>
    <div className="vh"><div><div className="eyebrow">Phase 1 · preview</div><h1>The CEO desk, before go-live</h1><p className="sub">This is the shape the customer CEO will get. The brain is not live. The build is {picture.done} of {picture.total} steps done.</p></div></div>
    <DepartmentGrid state={state} hrefBase="#team/bots" />
    <section className="card pad"><div className="ch"><h2>What the desk is made of</h2></div><div className="grid g2">{[
      ["Sources", "Approved files only. Excluded records never enter."],
      ["Answers", "Each answer needs a source. The preview will not guess."],
      ["Access", "Department teams see their own work. The CEO sees the company picture."],
      ["Refresh", "A person can withdraw a source. The index is not the filing cabinet."]
    ].map(([title, body]) => <article key={title}><b style={{ color: "var(--ink)" }}>{title}</b><p className="note">{body}</p></article>)}</div></section>
  </>;
}

function TeamBots({ deptId, state, setState }: { deptId: string; state: DemoState; setState: (value: DemoState | ((prev: DemoState) => DemoState)) => void }) {
  const department = catalog.find((item) => item.id === deptId) || catalog[0];
  return <>
    <div className="vh"><div><div className="eyebrow">Phase 1 · Superbots</div><h1>{department.name}</h1><p className="sub">{department.mandate} Templates below are starters, not live automations.</p></div></div>
    <MetricRow id={department.id} />
    <section className="card pad"><div className="ch"><h2>Workflows being prepared</h2></div>
      {department.workflows.map((workflow) => {
        const ready = state.ready.includes(workflow.id);
        return <div className="plainrow" key={workflow.id}><span /><span><b>{workflow.name}</b><small>{workflow.description}</small></span><button type="button" className={ready ? "btn sm" : "btn sm ghost"} onClick={() => setState((prev) => ({ ...prev, ready: ready ? prev.ready.filter((id) => id !== workflow.id) : [...prev.ready, workflow.id] }))}>{ready ? "In the CEO preview" : "Keep internal"}</button></div>;
      })}
    </section>
  </>;
}

function CeoBrain({ state }: { state: DemoState }) {
  return <>
    <div className="vh"><div><div className="eyebrow">Phase 2 · {state.admin.brainName}</div><h1>The company, from the sample pack</h1><p className="sub">Ask the brain, then open a department. Answers stay inside the Harbour Learning sample.</p></div></div>
    <div className="grid g2">
      <BrainChat title={state.admin.brainName} abstain={state.admin.abstain} />
      <div>
        <div className="grid g2"><Kpi label="Open work" value="18" detail="Sample items across nine teams" /><Kpi label="Waiting on a person" value="4" detail="Drafts are not actions" /></div>
        <section className="card pad" style={{ marginTop: 16 }}><div className="ch"><h2>Departments</h2><a href="#live/ceo/bots">Open Superbots</a></div>
          {catalog.filter((item) => state.admin.departments[item.id]?.enabled !== false).map((item) => <a className="checkrow" key={item.id} href={`#live/ceo/bots/${item.id}`}><span className="count">{item.code}</span><span><b>{item.name}</b><small>{METRICS[item.id]?.[0]?.[0]} {METRICS[item.id]?.[0]?.[1]}</small></span><span className="note">View</span></a>)}
        </section>
      </div>
    </div>
  </>;
}

function CeoBots({ deptId, state, setState }: { deptId: string; state: DemoState; setState: (value: DemoState | ((prev: DemoState) => DemoState)) => void }) {
  if (!deptId) return <>
    <div className="vh"><div><div className="eyebrow">Phase 2 · Superbots</div><h1>Choose a department</h1><p className="sub">Each page is that team’s sample performance. You can add a workflow draft. It is not started.</p></div></div>
    <DepartmentGrid state={state} hrefBase="#live/ceo/bots" />
  </>;
  const department = catalog.find((item) => item.id === deptId) || catalog[0];
  const drafts = state.drafts.filter((draft) => draft.departmentId === department.id);
  return <>
    <div className="vh"><div><div className="eyebrow">{department.code} · sample performance</div><h1>{department.name}</h1><p className="sub">{department.focus}</p></div><a className="btn ghost" href="#live/ceo/bots">All departments</a></div>
    <MetricRow id={department.id} />
    <section className="card pad"><div className="ch"><h2>Workflows</h2></div>
      {department.workflows.map((workflow) => <div className="plainrow" key={workflow.id}><span /><span><b>{workflow.name}</b><small>{workflow.description}</small></span><span className="note">{state.ready.includes(workflow.id) ? "Template" : "Internal"}</span></div>)}
      {drafts.map((draft) => <div className="plainrow" key={draft.id}><span /><span><b>{draft.name}</b><small>{draft.purpose}</small></span><span className="flag">Draft · this browser</span></div>)}
    </section>
    <WorkflowForm departmentId={department.id} onCreate={(draft) => setState((prev) => ({ ...prev, drafts: [draft, ...prev.drafts] }))} />
  </>;
}

function DepartmentPortal({ deptId, state, setState }: { deptId: string; state: DemoState; setState: (value: DemoState | ((prev: DemoState) => DemoState)) => void }) {
  const department = catalog.find((item) => item.id === deptId) || catalog[0];
  const settings = state.admin.departments[department.id] || { enabled: true, chat: true };
  const drafts = state.drafts.filter((draft) => draft.departmentId === department.id);
  return <>
    <div className="vh"><div><div className="eyebrow">Phase 2 · department team</div><h1>{department.name}</h1><p className="sub">{department.mandate}</p></div></div>
    {!settings.enabled && <div className="banner-need" role="status"><strong>Hidden in the preview. </strong>An admin turned this department off. The sample is still here.</div>}
    <div className="grid g2">
      {settings.chat ? <BrainChat title={`${department.short} brain`} abstain={state.admin.abstain} hint={`Ask about ${department.short}. Restricted records stay excluded.`} /> : <section className="card pad"><h2>Chat is off</h2><p>The admin preview has chat disabled for this department.</p></section>}
      <div><MetricRow id={department.id} /></div>
    </div>
    <section className="card pad"><div className="ch"><h2>Workflows</h2></div>
      {department.workflows.map((workflow) => <div className="plainrow" key={workflow.id}><span /><span><b>{workflow.name}</b><small>{workflow.description}</small></span><span className="note">Template · not running</span></div>)}
      {drafts.map((draft) => <div className="plainrow" key={draft.id}><span /><span><b>{draft.name}</b><small>{draft.purpose}</small></span><span className="flag">Draft · this browser</span></div>)}
    </section>
    <WorkflowForm departmentId={department.id} onCreate={(draft) => setState((prev) => ({ ...prev, drafts: [draft, ...prev.drafts] }))} />
  </>;
}

function AdminPortal({ state, setState }: { state: DemoState; setState: (value: DemoState | ((prev: DemoState) => DemoState)) => void }) {
  const admin = state.admin;
  function patchAdmin(partial: Partial<DemoState["admin"]>) {
    setState((prev) => ({ ...prev, admin: { ...prev.admin, ...partial } }));
  }
  return <>
    <div className="vh"><div><div className="eyebrow">Phase 2 · AqionBrain admin</div><h1>Same brain, with the settings</h1><p className="sub">This is the CEO brain plus the switches for the preview. Changes stay in this browser. They are not deployed.</p></div></div>
    <div className="grid g2">
      <BrainChat title={admin.brainName} abstain={admin.abstain} />
      <section className="card pad"><div className="ch"><h2>CEO brain</h2></div><div className="stack">
        <label>Display name<input aria-label="Brain name" value={admin.brainName} onChange={(event) => patchAdmin({ brainName: event.target.value.slice(0, 80) })} /></label>
        <label><input type="checkbox" checked={admin.abstain} onChange={(event) => patchAdmin({ abstain: event.target.checked })} /> Say when the sample has no source</label>
      </div><p className="note">Turning this off does not invent an answer. This preview still refuses to guess.</p></section>
    </div>
    <section className="card pad"><div className="ch"><h2>Department portals</h2></div>
      {catalog.map((item) => {
        const settings = admin.departments[item.id] || { enabled: true, chat: true };
        function patchDept(partial: Partial<{ enabled: boolean; chat: boolean }>) {
          setState((prev) => ({ ...prev, admin: { ...prev.admin, departments: { ...prev.admin.departments, [item.id]: { ...settings, ...partial } } } }));
        }
        return <div className="plainrow" key={item.id}><span className="count">{item.code}</span><span><b>{item.name}</b><small><a href={`#live/dept/${item.id}`}>Open the department portal</a></small></span><span style={{ display: "flex", gap: 12 }}><label><input type="checkbox" checked={settings.enabled} onChange={(event) => patchDept({ enabled: event.target.checked })} /> Shown</label><label><input type="checkbox" checked={settings.chat} onChange={(event) => patchDept({ chat: event.target.checked })} /> Chat</label></span></div>;
      })}
    </section>
  </>;
}

function DepartmentGrid({ state, hrefBase }: { state: DemoState; hrefBase: string }) {
  return <div className="grid g3">{catalog.map((item) => {
    const hidden = state.admin.departments[item.id]?.enabled === false;
    const first = METRICS[item.id]?.[0];
    return <a className="card pad" key={item.id} href={`${hrefBase}/${item.id}`} style={{ textDecoration: "none" }}><div className="l">{item.code}{hidden ? " · hidden" : ""}</div><h2 style={{ fontSize: 18 }}>{item.name}</h2><p className="note">{first ? `${first[0]}: ${first[1]}. ${first[2]}.` : item.focus}</p></a>;
  })}</div>;
}

function MetricRow({ id }: { id: string }) {
  const rows = METRICS[id] || [];
  return <div className="grid g3">{rows.map(([label, value, detail]) => <Kpi key={label} label={label} value={value} detail={detail} />)}</div>;
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="card kpi pad"><div className="l">{label}</div><div className="v">{value}</div><div className="x">{detail}</div></article>;
}

function WorkflowForm({ departmentId, onCreate }: { departmentId: string; onCreate: (draft: DemoState["drafts"][number]) => void }) {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  return <section className="card pad"><div className="ch"><h2>New workflow</h2></div><p className="note">Creates a draft in this browser. It does not run, send, or enter a review queue.</p><div className="stack">
    <label>Name<input aria-label="Workflow name" value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Purpose<textarea aria-label="Workflow purpose" rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} /></label>
    <button type="button" className="btn" disabled={!name.trim()} onClick={() => { onCreate({ id: `${departmentId}-${Date.now()}`, departmentId, name: name.trim(), purpose: purpose.trim() || "Draft purpose" }); setName(""); setPurpose(""); }}>Save draft</button>
  </div></section>;
}

function BrainChat({ title, abstain, hint }: { title: string; abstain: boolean; hint?: string }) {
  const [lines, setLines] = useState<{ who: "you" | "brain"; text: string; cite?: string }[]>([{ who: "brain", text: hint || "Ask about services, policy, or the sample pipeline. Payroll stays excluded.", cite: "Sample · not a connected model" }]);
  const [text, setText] = useState("");
  useEffect(() => { setLines([{ who: "brain", text: hint || "Ask about services, policy, or the sample pipeline. Payroll stays excluded.", cite: "Sample · not a connected model" }]); }, [title, hint]);
  function ask(value: string) {
    const question = value.trim();
    if (!question) return;
    const answer = sampleAnswer(question);
    const cite = answer.refused ? answer.cite : abstain ? answer.cite : `${answer.cite} · abstain preview is off, source still required`;
    setLines((prev) => [...prev, { who: "you", text: question }, { who: "brain", text: answer.text, cite }]);
    setText("");
  }
  return <section className="card pad" aria-label={title}><div className="ch"><h2>{title}</h2><span className="pill a"><i />Sample</span></div>
    <div>{lines.map((line, index) => <div className={line.who === "you" ? "chatline you" : "chatline"} key={index}><b>{line.who === "you" ? "You" : "Brain"}</b><div>{line.text}</div>{line.cite && <small>{line.cite}</small>}</div>)}</div>
    <div className="deptpick">{["What services do we sell?", "Who owns the leave policy?", "Show me payroll"].map((prompt) => <button type="button" className="btn sm ghost" key={prompt} onClick={() => ask(prompt)}>{prompt}</button>)}</div>
    <form className="ask" onSubmit={(event) => { event.preventDefault(); ask(text); }}><input aria-label="Question" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask the sample brain" /><button className="btn" type="submit">Ask</button></form>
  </section>;
}
