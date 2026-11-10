import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/fraunces/latin-600.css";
import "../../src/portal.css";
import "./customer.css";

type Step = { id: string; n: number; name: string; customerTitle: string; customerWork: boolean; summary: string; status: string; progress: number; needsYou: boolean };
type Source = { id: string; title: string; examples: string; location: string; use: string; sensitivity: string; owner: string; notForAi: boolean };
type Owner = { sourceId: string; department: string; ownerName: string; dueDate: string; authority: string; notForAi: boolean; notes: string };
type Submission = { sourceId: string; target: string; note: string; submittedAt: string };
type State = { role: "customer" | "staff"; sources: Source[]; steps: Step[]; owners: Owner[]; submissions: Submission[]; targets: { github: string; drive: string }; attention: string[] };

function statusLabel(step: Step) {
  if (step.needsYou) return "Needs you";
  if (step.status === "in_progress") return "With Aqion";
  if (step.status === "done") return "Done";
  if (step.status === "waiting_on_customer") return "Needs you";
  return "Not started";
}

async function request(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { const error = new Error("signin"); (error as Error & { status: number }).status = 401; throw error; }
  if (!response.ok) { const error = new Error(data.error || "Request failed") as Error & { status: number; data: unknown }; error.status = response.status; error.data = data; throw error; }
  return data;
}

function App() {
  const [hash, setHash] = useState(window.location.hash || "#pm");
  const [state, setState] = useState<State | null>(null);
  const [ready, setReady] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => { const onHash = () => setHash(window.location.hash || "#pm"); window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash); }, []);
  async function load() {
    try { setState(await request("/api/state")); setSignedOut(false); }
    catch { setSignedOut(true); setState(null); }
    finally { setReady(true); }
  }
  useEffect(() => { void load(); }, []);
  if (!ready) return <main className="page"><p role="status">Opening Superbrain PM…</p></main>;
  if (signedOut || !state) return <Gate staff={hash.startsWith("#staff")} onReady={load} />;
  const stepId = hash.replace("#", "");
  const step = state.steps.find((item) => item.id === stepId);
  return <div className="portal">
    <aside className="side" aria-label="Build steps">
      <a className="brand" href="#pm"><span className="mark">AQ</span><span><b>Superbrain PM</b><small>Phase 1 · customer</small></span></a>
      <nav aria-label="Build steps">
        <div className="navlabel">Build steps</div>
        <a className={stepId === "pm" || stepId === "" ? "nav on" : "nav"} href="#pm">Build status</a>
        {state.steps.map((item) => <a key={item.id} className={stepId === item.id ? "nav on" : "nav"} href={`#${item.id}`}><span className="num">{item.n}</span><span>{item.name}</span>{item.needsYou && <span className="count need">Needs you</span>}</a>)}
      </nav>
      <div className="sidefoot">Your assignments and file handoff are stored for this portal. Nothing is sent to a model.</div>
    </aside>
    <div className="maincol">
      <header className="topbar"><div className="ctx"><span>Aqion Superbrain</span><span aria-hidden="true">/</span><b>Superbrain PM</b></div><button type="button" className="btn ghost sm" onClick={async () => { await request("/api/logout", { method: "POST" }); setSignedOut(true); setState(null); }}>Sign out</button></header>
      <div className="page">
        <div className="hosting-notice" role="note"><strong>Customer build.</strong><span>The 18 sources and nine steps follow the Ethikcorp setup document. Steps 3 to 9 are Aqion’s work. UAE processing is not configured.</span></div>
        {stepId !== "staff" && (!step || stepId === "pm") && <Dashboard state={state} />}
        {step?.id === "discovery" && <Discovery state={state} reload={load} />}
        {step?.id === "collection" && <Collection state={state} reload={load} />}
        {step && step.id !== "discovery" && step.id !== "collection" && <AqionStep step={step} />}
        {stepId === "staff" && (state.role === "staff" ? <Staff state={state} reload={load} /> : <section className="card pad"><h1>Staff access is required</h1><p><a href="#staff">Sign in with the staff code</a> after signing out, or open the staff invite separately.</p></section>)}
      </div>
    </div>
  </div>;
}

function Gate({ staff, onReady }: { staff: boolean; onReady: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  return <main className="page" style={{ maxWidth: 520, margin: "10vh auto" }}>
    <div className="card pad">
      <div className="eyebrow">{staff ? "Aqion staff" : "Superbrain PM"}</div>
      <h1>{staff ? "Staff access" : "Enter the customer portal"}</h1>
      <p className="sub">This portal is not a public form. Use the access code or the invite link you were given.</p>
      <form className="stack" onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        try { await request("/api/login", { method: "POST", body: JSON.stringify({ code, role: staff ? "staff" : "customer" }) }); await onReady(); }
        catch { setError("That access code is not valid."); }
      }}>
        <label>Access code<input aria-label="Access code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" /></label>
        <button className="btn" type="submit">Continue</button>
        {error && <p className="flag" role="alert">{error}</p>}
      </form>
    </div>
  </main>;
}

function Dashboard({ state }: { state: State }) {
  const done = state.steps.filter((step) => step.status === "done").length;
  const percent = Math.round(state.steps.reduce((sum, step) => sum + (step.status === "done" ? 100 : step.progress), 0) / state.steps.length);
  return <>
    <div className="vh"><div><div className="eyebrow">Superbrain PM · Phase 1</div><h1>Where the build stands</h1><p className="sub">Nine steps, in the order of the data pipeline. You own the first two. A red “Needs you” mark is the only open ask.</p></div></div>
    <div className="grid g3">
      <article className="card kpi pad"><div className="l">Steps done</div><div className="v">{done} of 9</div><div className="x">A done step is not a signed acceptance</div></article>
      <article className="card kpi pad"><div className="l">Overall progress</div><div className="v">{percent}%</div><div className="meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div></article>
      <article className="card kpi pad"><div className="l">Waiting on you</div><div className="v">{state.attention.length}</div><div className="x">{state.attention.length ? "Open the marked step" : "Nothing needed right now"}</div></article>
    </div>
    {state.attention.length > 0 && <div className="banner-need" role="status"><strong>Needs you. </strong>{state.attention.map((id) => state.steps.find((step) => step.id === id)?.name).join(", ")}</div>}
    <section className="card pad" aria-label="Checklist"><div className="ch"><h2>Checklist</h2></div>
      {state.steps.map((step) => <a className="checkrow" key={step.id} href={`#${step.id}`}><span className="num">{step.n}</span><span><b>{step.name}</b><small>{step.customerWork ? "Your step" : "Aqion"}</small></span><span className={step.needsYou ? "flag" : "note"}>{statusLabel(step)}</span></a>)}
    </section>
  </>;
}

function Discovery({ state, reload }: { state: State; reload: () => Promise<void> }) {
  const [errors, setErrors] = useState<{ row: number; message: string }[]>([]);
  const [imported, setImported] = useState<Owner[] | null>(state.owners.length ? state.owners : null);
  const step = state.steps.find((item) => item.id === "discovery")!;
  return <>
    <StepHead step={step} />
    <section className="card pad"><div className="ch"><h2>Ownership assignment</h2></div>
      <p>Download the workbook, fill the owner, due date, and whether each source is authoritative or context-only, then upload it here. The 18 sources and their departments are already filled from the setup document.</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={async () => {
          const response = await fetch("/api/ownership.xlsx");
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url; link.download = "ethikcorp-source-ownership.xlsx"; link.click();
          URL.revokeObjectURL(url);
        }}>Download Excel</button>
      </div>
      <form className="stack" style={{ marginTop: 16 }} onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = new FormData(form);
        setErrors([]);
        try {
          const result = await request("/api/ownership", { method: "POST", body });
          setImported(result.imported);
          await reload();
        } catch (error) {
          const data = (error as { data?: { errors?: { row: number; message: string }[] } }).data;
          setImported(null);
          setErrors(data?.errors || [{ row: 0, message: "The file could not be imported." }]);
        }
      }}>
        <label>Completed workbook<input aria-label="Completed workbook" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required /></label>
        <button className="btn" type="submit">Upload and import</button>
      </form>
      {errors.length > 0 && <ul className="import-errors" role="alert">{errors.map((error) => <li key={`${error.row}-${error.message}`}>{error.message}</li>)}</ul>}
    </section>
    {imported && <section className="card pad"><div className="ch"><h2>Imported assignments</h2><span className="note">{imported.length} sources stored</span></div>
      <table className="tbl"><thead><tr><th>Source</th><th>Department</th><th>Owner</th><th>Due</th><th>Flag</th><th>Not for AI</th></tr></thead><tbody>
        {imported.map((row) => <tr key={row.sourceId}><td>{state.sources.find((source) => source.id === row.sourceId)?.title || row.sourceId}</td><td>{row.department}</td><td>{row.ownerName}</td><td>{row.dueDate}</td><td>{row.authority}</td><td>{row.notForAi ? "Yes" : "No"}</td></tr>)}
      </tbody></table>
    </section>}
  </>;
}

function Collection({ state, reload }: { state: State; reload: () => Promise<void> }) {
  const step = state.steps.find((item) => item.id === "collection")!;
  return <>
    <StepHead step={step} />
    <div className="targets">
      <Target label="GitHub repository" url={state.targets.github} />
      <Target label="Google Drive folder" url={state.targets.drive} />
    </div>
    <div className="grid" style={{ marginTop: 16 }}>{state.sources.map((source) => <SourceForm key={source.id} source={source} owner={state.owners.find((row) => row.sourceId === source.id)} saved={state.submissions.find((row) => row.sourceId === source.id)} reload={reload} />)}</div>
  </>;
}

function Target({ label, url }: { label: string; url: string }) {
  return <article className="card pad"><div className="l">{label}</div>{url ? <a href={url}>{url}</a> : <p className="note">Aqion has not published this link yet.</p>}</article>;
}

function SourceForm({ source, owner, saved, reload }: { source: Source; owner?: Owner; saved?: Submission; reload: () => Promise<void> }) {
  const [target, setTarget] = useState(saved?.target || "github");
  const [note, setNote] = useState(saved?.note || "");
  const [message, setMessage] = useState("");
  return <section className="card pad source-card"><div className="ch"><h2>{source.title}</h2>{source.notForAi && <span className="pill r"><i />Not for AI in the setup</span>}</div>
    <dl>
      <dt>Examples</dt><dd>{source.examples}</dd>
      <dt>Where it lives</dt><dd>{source.location}</dd>
      <dt>Use</dt><dd>{source.use}</dd>
      <dt>Sensitivity</dt><dd>{source.sensitivity}</dd>
      <dt>Owning department</dt><dd>{owner?.department || source.owner}{owner ? ` · ${owner.ownerName}` : ""}</dd>
    </dl>
    <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      setMessage("");
      try {
        await request("/api/submissions", { method: "POST", body: JSON.stringify({ sourceId: source.id, target, note }) });
        setMessage("Saved.");
        await reload();
      } catch (error) { setMessage((error as Error).message); }
    }}>
      <label>Where this source goes<select aria-label={`Target for ${source.title}`} value={target} onChange={(event) => setTarget(event.target.value)}><option value="github">GitHub repository</option><option value="drive">Google Drive folder</option><option value="not_applicable">Not applicable / not for AI</option></select></label>
      <label>Link or note<textarea aria-label={`Note for ${source.title}`} rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label>
      <button className="btn" type="submit">{saved ? "Update submission" : "Submit"}</button>
      {saved && <p className="note">Last saved {saved.submittedAt.slice(0, 16).replace("T", " ")} UTC.</p>}
      {message && <p role="status">{message}</p>}
    </form>
  </section>;
}

function AqionStep({ step }: { step: Step }) {
  return <>
    <StepHead step={step} />
    <section className="card pad"><div className="ch"><h2>What Aqion is doing</h2></div><p>{step.summary}</p><p className="note">This step has no customer form. If Aqion needs something from you, it shows as “Needs you”.</p></section>
  </>;
}

function StepHead({ step }: { step: Step }) {
  return <>
    <div className="vh"><div><div className="eyebrow">Step {step.n} of 9 · {step.name}</div><h1>{step.customerTitle}</h1><p className="sub">{step.summary}</p></div><a className="btn ghost" href="#pm">Back to status</a></div>
    {step.needsYou && <div className="banner-need" role="status"><strong>Needs you. </strong>Aqion is waiting on this step.</div>}
    <div className="grid g2">
      <article className="card kpi pad"><div className="l">Status</div><div className="v" style={{ fontSize: 22 }}>{statusLabel(step)}</div><div className="x">{step.customerWork ? "Your step" : "Aqion"}</div></article>
      <article className="card kpi pad"><div className="l">Progress</div><div className="v">{step.status === "done" ? 100 : step.progress}%</div><div className="meter"><span style={{ width: `${step.status === "done" ? 100 : step.progress}%` }} /></div></article>
    </div>
  </>;
}

function Staff({ state, reload }: { state: State; reload: () => Promise<void> }) {
  const [github, setGithub] = useState(state.targets.github);
  const [drive, setDrive] = useState(state.targets.drive);
  const [message, setMessage] = useState("");
  return <>
    <div className="vh"><div><div className="eyebrow">This worker only</div><h1>Delivery links and customer flags</h1><p className="sub">Set the two links the customer sees, and flag a step when you need them. This does not change the existing Superbrain preview.</p></div></div>
    <section className="card pad"><form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      try { await request("/api/staff/targets", { method: "POST", body: JSON.stringify({ github, drive }) }); setMessage("Links saved."); await reload(); }
      catch (error) { setMessage((error as Error).message === "signin" ? "Staff access is required." : (error as Error).message); }
    }}>
      <label>GitHub repository URL<input aria-label="GitHub repository URL" value={github} onChange={(event) => setGithub(event.target.value)} /></label>
      <label>Google Drive folder URL<input aria-label="Google Drive folder URL" value={drive} onChange={(event) => setDrive(event.target.value)} /></label>
      <button className="btn" type="submit">Save links</button>
    </form>{message && <p role="status">{message}</p>}</section>
    <div className="grid" style={{ marginTop: 16 }}>{state.steps.map((step) => <StaffStep key={step.id} step={step} reload={reload} />)}</div>
  </>;
}

function StaffStep({ step, reload }: { step: Step; reload: () => Promise<void> }) {
  const [status, setStatus] = useState(step.status);
  const [needsInput, setNeedsInput] = useState(step.needsYou || step.status === "waiting_on_customer");
  const [summary, setSummary] = useState(step.summary);
  const [progress, setProgress] = useState(step.progress);
  return <section className="card pad"><h2>{step.n}. {step.name}</h2><form className="stack" onSubmit={async (event) => {
    event.preventDefault();
    await request("/api/staff/steps", { method: "POST", body: JSON.stringify({ id: step.id, status, needsInput, summary, progress }) });
    await reload();
  }}>
    <label>Status<select aria-label={`Status for ${step.name}`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="waiting_on_customer">Waiting on customer</option><option value="done">Done</option></select></label>
    <label>Progress ({progress}%)<input aria-label={`Progress for ${step.name}`} type="range" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} /></label>
    <label>Customer summary<textarea aria-label={`Summary for ${step.name}`} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
    <label><input type="checkbox" checked={needsInput} onChange={(event) => setNeedsInput(event.target.checked)} /> Needs customer input</label>
    <button className="btn" type="submit">Save step</button>
  </form></section>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
