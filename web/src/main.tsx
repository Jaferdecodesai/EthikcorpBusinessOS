import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fira-sans/latin-400.css";
import "@fontsource/fira-sans/latin-500.css";
import "@fontsource/fira-sans/latin-600.css";
import "@fontsource/fira-sans/latin-700.css";
import "@fontsource/fira-code/latin-500.css";
import { sources, stages, type Source, type Stage } from "./data";
import "./style.css";
import { DepartmentsApp } from "./DepartmentsApp";
import { cloudPreview, ensureCloudSession, HostingNotice } from "./hosting";
import { PortalFrame } from "./portal-frame";
import { CeoDesk } from "./ceo";
import { KnowledgeAdmin } from "./knowledge";
import "./portal.css";

type SourceRecord = { status: "not-started" | "located" | "uploaded" | "excluded"; owner: string; locator: string; approvalRef: string; note: string; githubPath?: string; fileName?: string };
type Repo = { owner: string; name: string; branch: string; root: string };
type PMState = { checked: Record<string, boolean>; records: Record<string, SourceRecord>; repo: Repo; lastReview?: string; lastSync?: string };

const STORAGE_KEY = "superbrain-pm-ethikcorp-v1";
const initialState: PMState = {
  checked: {}, records: {}, repo: { owner: "", name: "", branch: "main", root: "superbrain-pm" }
};
const uploadable = new Set(["profile", "policies", "sops", "tasks", "marketing"]);

function loadState(): PMState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return {
      checked: parsed.checked && typeof parsed.checked === "object" ? parsed.checked : {},
      records: parsed.records && typeof parsed.records === "object" ? parsed.records : {},
      repo: { ...initialState.repo, ...(parsed.repo || {}) },
      lastReview: parsed.lastReview, lastSync: parsed.lastSync
    };
  } catch { return initialState; }
}

function stageProgress(stage: Stage, checked: Record<string, boolean>) {
  const done = stage.tasks.filter((task) => checked[task.id]).length;
  return { done, total: stage.tasks.length };
}

function App({ initialStage = "overview" }: { initialStage?: string }) {
  const [state, setState] = useState<PMState>(loadState);
  const [active, setActive] = useState(initialStage && initialStage !== "overview" ? initialStage : "overview");
  useEffect(() => { setActive(stages.some((stage) => stage.id === initialStage) ? initialStage : "overview"); }, [initialStage]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [serverReady, setServerReady] = useState<boolean | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>("profile");
  const completed = stages.reduce((n, stage) => n + stageProgress(stage, state.checked).done, 0);
  const total = stages.reduce((n, stage) => n + stage.tasks.length, 0);
  const found = sources.filter((s) => {
    const text = `${s.title} ${s.examples} ${s.owner}`.toLowerCase();
    const status = state.records[s.id]?.status || "not-started";
    return text.includes(sourceQuery.toLowerCase()) && (sourceFilter === "all" || status === sourceFilter);
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then((d) => setServerReady(Boolean(d.githubTokenConfigured))).catch(() => setServerReady(false));
  }, []);
  useEffect(() => { if (message) { const id = setTimeout(() => setMessage(""), 6500); return () => clearTimeout(id); } }, [message]);

  function patchRepo(key: keyof Repo, value: string) {
    setState((prev) => ({ ...prev, repo: { ...prev.repo, [key]: value } }));
  }
  function patchRecord(id: string, patch: Partial<SourceRecord>) {
    setState((prev) => ({
      ...prev,
      records: { ...prev.records, [id]: { ...(prev.records[id] ?? { status: "not-started", owner: "", locator: "", approvalRef: "", note: "" }), ...patch } }
    }));
  }
  function toggleTask(id: string) {
    setState((prev) => ({ ...prev, checked: { ...prev.checked, [id]: !prev.checked[id] } }));
  }
  function openTask(stage: Stage, taskId: string) {
    setActive(stage.id);
    setSelectedTaskId(taskId);
  }
  async function api(path: string, body: unknown) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }
  async function testRepo() {
    setBusy("test");
    try {
      const data = await api("/api/github/test", { repo: state.repo });
      setMessage(`Connected to private repository ${data.fullName} on ${data.branch}.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Connection failed."); }
    finally { setBusy(""); }
  }
  async function syncPlan() {
    setBusy("sync");
    try {
      const data = await api("/api/github/save", { repo: state.repo, state });
      setState((prev) => ({ ...prev, lastSync: new Date().toISOString() }));
      setMessage(`Plan committed to ${data.path} at ${data.commit.slice(0, 8)}.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Sync failed."); }
    finally { setBusy(""); }
  }
  async function loadPlan() {
    setBusy("load");
    try {
      const data = await api("/api/github/load", { repo: state.repo });
      const remote = data.state as PMState;
      if (!remote || !remote.checked || !remote.records) throw new Error("The repository plan is invalid.");
      setState({ ...initialState, ...remote, repo: state.repo });
      setMessage("Plan loaded from the private GitHub repository.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Load failed."); }
    finally { setBusy(""); }
  }
  async function uploadSource(source: Source, file: File) {
    const record = state.records[source.id];
    if (!record?.owner?.trim() || !record.locator?.trim()) { setMessage("Add a named owner and original source URL/path before upload."); return; }
    if (!record.approvalRef?.trim()) { setMessage("Record the client owner's approval reference before upload."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("This pilot accepts files up to 5 MB. Split or review larger sources first."); return; }
    setBusy(`upload-${source.id}`);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const data = await api("/api/github/upload", {
        repo: state.repo, sourceId: source.id, fileName: file.name, base64: btoa(binary),
        originalLocator: record.locator, owner: record.owner, approvalRef: record.approvalRef, approved: true
      });
      patchRecord(source.id, { status: "uploaded", githubPath: data.path, fileName: file.name });
      setMessage(`Uploaded to ${data.path}. ${data.indexingNote}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Upload failed."); }
    finally { setBusy(""); }
  }
  function exportPlan() {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "superbrain-pm-plan.json"; a.click(); URL.revokeObjectURL(url);
  }

  const selectedStage = stages.find((s) => s.id === active);
  const checklistStage = selectedStage || stages[0];
  const selectedTask = selectedStage?.tasks.find((task) => task.id === selectedTaskId) || selectedStage?.tasks[0];
  function goStage(id: string) { window.location.hash = id === "overview" ? "pm" : `pm/${id}`; }
  return (
    <div className="pm-workspace">
      <div className="vh">
        <div><div className="eyebrow">Customer formation journey</div><h1>{selectedStage ? selectedStage.name : "From records to a reviewed brain"}</h1><p className="sub">Work through the nine stages. Checklist progress is {completed} of {total}. A tick records evidence. It does not accept the brain or open an index.</p></div>
        <button className="btn ghost" onClick={exportPlan}>Export plan</button>
      </div>
      <ol className="stepper" aria-label="Formation stages">{stages.map((stage, index) => {
        const progress = stageProgress(stage, state.checked);
        const cls = active === stage.id ? "cur" : progress.done === progress.total ? "done" : "";
        return <li key={stage.id} className={cls}><button type="button" onClick={() => goStage(stage.id)} aria-current={active === stage.id ? "step" : undefined}><b>{index + 1}</b><span>{stage.short}</span></button></li>;
      })}</ol>
      <HostingNotice />
      <main className="main">
        <div className="content">
          {active === "overview" ? <>
            <div className="stage-board">{stages.map((stage) => { const p = stageProgress(stage, state.checked); return <button className="card kpi pad" key={stage.id} onClick={() => goStage(stage.id)}><div className="l">{stage.short}</div><div className="v">{p.done}/{p.total}</div><div className="x">{stage.name}</div></button>; })}</div>
            <Pipeline />
          </> : selectedStage ? <>
            {active === "discovery" && <TemplateBanner />}
            <section className="stage-intro"><div><span className="step-label">PROCESS {String(stages.indexOf(selectedStage) + 1).padStart(2, "0")} OF 09</span><p>{selectedStage.summary}</p></div><div className="gate-note"><small>EXIT GATE</small><strong>{selectedStage.gate}</strong></div></section>
            <section className="section"><div className="section-head"><h2>What Ethikcorp provides</h2><p>Client input is reviewed by its named owner.</p></div><ol className="requirements">{selectedStage.client.map((item) => <li key={item}>{item}</li>)}</ol></section>
            {selectedTask && <section className="section task-detail" aria-live="polite"><div className="section-head"><span className="step-label">SELECTED TASK</span><h2>{selectedTask.label}</h2><p>Completion evidence: {selectedTask.evidence}. Mark it complete in the checklist after the client approves the evidence.</p></div>{selectedTask.id === "discover-owners" ? <SourceOwnersPanel records={state.records} patchRecord={patchRecord} /> : <div className="task-instruction"><strong>What to produce</strong><p>{selectedTask.evidence}</p><span>Use the client inputs above and keep the evidence in the client-approved project workspace.</span></div>}</section>}
            {active === "collection" && <CollectionPanel state={state} patchRepo={patchRepo} patchRecord={patchRecord} query={sourceQuery} setQuery={setSourceQuery} filter={sourceFilter} setFilter={setSourceFilter} found={found} expanded={expandedSource} setExpanded={setExpandedSource} serverReady={serverReady} busy={busy} testRepo={testRepo} syncPlan={syncPlan} loadPlan={loadPlan} uploadSource={uploadSource} />}
            {active === "embeddings" && <Pipeline />}
            {active === "access" && <TestPanel kind="access" />}
            {active === "evaluation" && <><TestPanel kind="quality" /><section className="card pad" style={{marginTop:16}}><div className="eyebrow">Selective fine-tuning</div><h2>Not warranted, and not started</h2><p className="sub">Retrieval remains the path for current facts. Fine-tuning would be a later decision after a demonstrated behavior gap, an approved dataset and a verified UAE training location. This screen does not train a model.</p></section></>}
          </> : null}
        </div>
      <aside className="checklist-panel card" aria-label="Stage checklist" style={{ marginTop: 16 }}><div className="checklist-kicker">ONE CHECKLIST</div><h2>{checklistStage.name}</h2><p>Select a task to see its work area. Use the separate checkbox only after its evidence has been approved.</p><div className="checklist-progress"><strong>{stageProgress(checklistStage, state.checked).done} / {checklistStage.tasks.length}</strong><span>tasks completed</span></div><div className="checklist-items">{checklistStage.tasks.map((task, i) => <div className={selectedStage?.id === checklistStage.id && selectedTask?.id === task.id ? "checklist-item selected" : "checklist-item"} key={task.id}><input type="checkbox" aria-label={`Mark ${task.label} complete`} checked={Boolean(state.checked[task.id])} onChange={() => toggleTask(task.id)} /><button type="button" onClick={() => openTask(checklistStage, task.id)}><small>0{i + 1} · {state.checked[task.id] ? "Complete" : "To do"}</small><strong>{task.label}</strong><span>View task →</span></button></div>)}</div><div className="checklist-note"><strong>Gate review</strong><p>Checklist completion records progress; it does not grant data or access approval.</p>{state.lastSync && <small>Last GitHub plan sync: {new Date(state.lastSync).toLocaleString("en-AE")}</small>}</div></aside>
      </main>
      {message && <div role="status" className="toast"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage("")}>×</button></div>}
    </div>
  );
}

function TemplateBanner() {
  return <section className="template-banner" aria-label="Discovery and inventory template"><div><span className="step-label">START HERE · CLIENT HANDOFF</span><h2>Discovery & inventory template</h2><p>Ethikcorp can complete the owner roster, 18-source register, access boundaries and approval fields before collection starts. The Word copy is editable; the PDF is for review or print.</p></div><div className="template-actions"><a href="/templates/ethikcorp-discovery-inventory-template.docx" download>Download editable Word</a><a href="/templates/ethikcorp-discovery-inventory-template.pdf" download>Download PDF</a></div></section>;
}

function SourceOwnersPanel({ records, patchRecord }: { records: PMState["records"]; patchRecord: (id: string, patch: Partial<SourceRecord>) => void }) {
  const assigned = sources.filter((source) => records[source.id]?.owner?.trim()).length;
  return <div className="owner-panel"><div className="owner-panel-head"><div><strong>18 source categories</strong><p>Enter a real Ethikcorp owner for each category. Suggested departments are prompts, not confirmed assignments. Record an exclusion decision and reason where a source is out of scope.</p></div><span>{assigned} / 18 owners named</span></div><div className="owner-list">{sources.map((source, index) => {
    const record = records[source.id] || { status: "not-started", owner: "", locator: "", approvalRef: "", note: "" };
    return <div className="owner-row" key={source.id}><div className="owner-source"><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{source.title}</strong><small>Examples: {source.examples}</small><small>Usually in {source.usualLocation} · Suggested lead: {source.owner}</small></div></div><label>Named client owner<input aria-label={`${source.title} named client owner`} value={record.owner} onChange={(e) => patchRecord(source.id, { owner: e.target.value })} placeholder="Name and department" /></label><label>Decision<select aria-label={`${source.title} decision`} value={record.status} onChange={(e) => patchRecord(source.id, { status: e.target.value as SourceRecord["status"] })}><option value="not-started">To review</option><option value="located">In scope / located</option><option value="excluded">Exclude from pilot</option>{record.githubPath && <option value="uploaded">Uploaded</option>}</select></label>{record.status === "excluded" && <label className="owner-reason">Exclusion reason<input aria-label={`${source.title} exclusion reason`} value={record.note} onChange={(e) => patchRecord(source.id, { note: e.target.value })} placeholder="Why this source stays out" /></label>}</div>;
  })}</div></div>;
}

function Pipeline() {
  return <section className="section pipeline-section"><div className="section-head"><h2>Where the data goes</h2><p>The Git repository is a source and audit layer. A vector index is a separate runtime.</p></div><div className="pipeline">
    <div><span className="pipe-index">01</span><strong>Private GitHub</strong><small>Approved small files, curated Markdown, manifests and commit history.</small></div>
    <div><span className="pipe-index">02</span><strong>GBrain import</strong><small>Inspect a clean committed checkout, preview, approve and record receipt.</small></div>
    <div><span className="pipe-index">03</span><strong>Local PGLite trial</strong><small>Chunk, embed and query locally. No live index is connected in this app.</small></div>
    <div><span className="pipe-index">04</span><strong>UAE Postgres later</strong><small>Production pgvector target after residency and access review. Hosted Supabase has no listed UAE region.</small></div>
  </div><div className="pipeline-note"><strong>Important boundary</strong><p>Uploading to GitHub does not create embeddings, vectors or a working GBrain brain. This PM records prerequisites and receipts. Supabase is a proposed PostgreSQL/pgvector operator only if a client-approved UAE deployment path is available.</p></div></section>;
}

function CollectionPanel(props: {
  state: PMState; patchRepo: (key: keyof Repo, value: string) => void; patchRecord: (id: string, patch: Partial<SourceRecord>) => void;
  query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void; found: Source[];
  expanded: string | null; setExpanded: (value: string | null) => void; serverReady: boolean | null; busy: string;
  testRepo: () => void; syncPlan: () => void; loadPlan: () => void; uploadSource: (source: Source, file: File) => void;
}) {
  const { state, patchRepo, patchRecord, query, setQuery, filter, setFilter, found, expanded, setExpanded, serverReady, busy, testRepo, syncPlan, loadPlan, uploadSource } = props;
  return <>
    <section className="section connect-section"><div className="section-head"><h2>GitHub source datastore</h2><p>Connect a private repository. The server reads its token from an environment variable; it is never entered in this page.</p></div>
      <div className="connection-grid">
        <label>GitHub owner<input value={state.repo.owner} onChange={(e) => patchRepo("owner", e.target.value)} placeholder="organisation or account" /></label>
        <label>Private repository<input value={state.repo.name} onChange={(e) => patchRepo("name", e.target.value)} placeholder="ethikcorp-brain-sources" /></label>
        <label>Branch<input value={state.repo.branch} onChange={(e) => patchRepo("branch", e.target.value)} placeholder="main" /></label>
        <label>PM folder<input value={state.repo.root} onChange={(e) => patchRepo("root", e.target.value)} placeholder="superbrain-pm" /></label>
      </div>
      <div className="connection-actions"><span className={serverReady ? "config-status ready" : "config-status"}>{serverReady ? "Server token configured" : "Server token not configured"}</span><button disabled={Boolean(busy)} onClick={testRepo}>Test private repo</button><button disabled={Boolean(busy)} onClick={syncPlan}>Save plan to GitHub</button><button disabled={Boolean(busy)} onClick={loadPlan}>Load saved plan</button></div>
      <p className="field-help">{cloudPreview ? "GitHub upload is not enabled in this hosted preview. Export your plan, or use the local connector with an approved private repository." : <>Set <code>GITHUB_TOKEN</code> in the local server environment with repository content access.</>} Test must confirm the repository is private before any save or upload. The app saves source metadata and checklist state to <code>{state.repo.root || "superbrain-pm"}/state.json</code>.</p>
    </section>
    <section className="section"><div className="section-head"><h2>Source inventory</h2><p>All 18 categories from the reference inventory, pages 4–5. “Use” is a proposal from that document, not upload approval.</p></div>
      <div className="inventory-tools"><label>Find a source<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search source, owner or example" /></label><label>Status<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="not-started">Not started</option><option value="located">Located</option><option value="uploaded">Uploaded</option><option value="excluded">Excluded</option></select></label><span>{found.length} shown / 18</span></div>
      <div className="source-list">{found.map((source) => {
        const record = state.records[source.id] || { status: "not-started", owner: "", locator: "", approvalRef: "", note: "" };
        const open = expanded === source.id;
        const canUpload = uploadable.has(source.id) && record.status !== "excluded";
        return <article className="source-card" key={source.id}><button className="source-summary" aria-expanded={open} onClick={() => setExpanded(open ? null : source.id)}><span className="source-title"><strong>{source.title}</strong><small>{source.owner}</small></span><span className="source-use">{source.intendedUse}</span><span className={`source-sensitivity ${source.sensitivity.startsWith("Restricted") ? "restricted" : source.sensitivity.startsWith("Confidential") ? "confidential" : ""}`}>{source.sensitivity}</span><span className="source-state">{record.status.replace("-", " ")}</span><span className="expand-symbol" aria-hidden="true">{open ? "−" : "+"}</span></button>
          {open && <div className="source-detail"><div className="source-facts"><div><small>EXAMPLES</small><p>{source.examples}</p></div><div><small>USUAL LOCATION</small><p>{source.usualLocation}</p></div><div><small>PROPOSED USE</small><p>{source.intendedUse}</p></div><div><small>DEFAULT OWNER</small><p>{source.owner}</p></div><div><small>HOW TO FIND IT</small><p>{source.find}</p></div><div><small>HOW TO PREPARE IT</small><p>{source.prepare}</p></div></div>
            <div className="source-form"><label>Named client owner<input value={record.owner} onChange={(e) => patchRecord(source.id, { owner: e.target.value })} placeholder={source.owner + " lead"} /></label><label>Original source URL or folder path<input value={record.locator} onChange={(e) => patchRecord(source.id, { locator: e.target.value })} placeholder={source.usualLocation} /></label><label>Decision<select value={record.status} onChange={(e) => patchRecord(source.id, { status: e.target.value as SourceRecord["status"] })}><option value="not-started">Not started</option><option value="located">Located for review</option><option value="excluded">Excluded from pilot</option>{record.githubPath && <option value="uploaded">Uploaded to GitHub</option>}</select></label><label>Client approval reference<input value={record.approvalRef || ""} onChange={(e) => patchRecord(source.id, { approvalRef: e.target.value })} placeholder="Approval ticket or signed register ID" /></label><label className="note-field">Owner note<input value={record.note} onChange={(e) => patchRecord(source.id, { note: e.target.value })} placeholder="Version, rights, exclusion reason or review note" /></label></div>
            <div className="upload-line"><div><strong>{canUpload ? "Approved small-file upload" : "Metadata only for this pilot"}</strong><p>{canUpload ? "Record the client owner's approval reference, owner and original locator before selecting a reviewed file. Markdown is the GBrain-ready format; other files need conversion." : "This category may contain client IP, PII or restricted data. Record its location and decision; use a separate approved transfer route later."}</p>{record.githubPath && <small>GitHub: {record.githubPath}</small>}</div>{canUpload && <label className="file-button">Choose & upload<input type="file" accept=".md,.txt,.pdf,.docx" disabled={Boolean(busy)} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadSource(source, file); e.target.value = ""; }} /></label>}</div>
          </div>}</article>;
      })}{found.length === 0 && <div className="empty-state">No sources match this search. Clear the query or status filter.</div>}</div>
    </section>
  </>;
}

function TestPanel({ kind }: { kind: "access" | "quality" }) {
  const access = kind === "access";
  return <section className="section test-section"><div className="section-head"><h2>{access ? "Proposed access tests" : "Proposed answer-quality tests"}</h2><p>These are pilot test designs. Ethikcorp has not yet supplied a signed test set or run results.</p></div><div className="test-grid">{(access ? [
    ["Allowed source", "A Sales user asks about an approved Sales page and receives only permitted citations."],
    ["Cross-department denial", "A Sales user asks for Finance or HR material and the retrieval layer returns no restricted passage."],
    ["Client engagement denial", "A user on Client A asks about Client B's proposal, including by exact file title and prompt injection."],
    ["Revocation", "A source owner withdraws a page; subsequent searches and restored indexes do not return it."]
  ] : [
    ["Supported answer", "Question has a known current source. Reviewer checks factual correctness, section citation and version."],
    ["Stale conflict", "Old and new policies disagree. Answer uses the current approved version or flags the conflict."],
    ["No-answer case", "No authorized source answers the question. The bot states the gap without inventing a fact."],
    ["Bilingual and exact lookup", "Test Arabic/English phrasing and exact names, numbers and dates against source evidence."]
  ]).map(([title, body]) => <div className="test-case" key={title}><strong>{title}</strong><p>{body}</p></div>)}</div><p className="test-foot">Client reviewers define the question set, expected sources and release thresholds before running the evaluation. Observed tests cannot prove the absence of every possible leak.</p></section>;
}

function RootApp() {
  const [sessionReady, setSessionReady] = useState(!cloudPreview);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => { let active=true; ensureCloudSession().then(()=>{if(active)setSessionReady(true);}).catch(error=>{if(active)setSessionError(error.message);}); return ()=>{active=false;}; }, []);
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => { const update = () => setHash(window.location.hash); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  useEffect(() => {
    const clean = hash.replace(/^#/, "");
    document.title = clean.startsWith("departments") ? "Departments · Aqion Superbrain" : clean.startsWith("ceo") ? "CEO desk · Aqion Superbrain" : clean.startsWith("knowledge") ? "Knowledge · Aqion Superbrain" : "Formation · Aqion Superbrain";
  }, [hash]);
  if (!sessionReady) return <main className="cloud-session-status" role={sessionError ? "alert" : "status"}><h1>Aqion Superbrain</h1><p>{sessionError || "Opening your cloud workspace…"}</p>{sessionError && <button onClick={()=>location.reload()}>Try again</button>}</main>;
  const clean = hash.replace(/^#/, "");
  const stage = clean.startsWith("pm/") ? clean.slice(3) : "overview";
  const pm = loadState();
  let body = <App initialStage={stage} />;
  if (clean.startsWith("departments")) body = <DepartmentsApp hash={hash} sourceRecords={pm.records} />;
  else if (clean.startsWith("knowledge")) body = <KnowledgeAdmin records={pm.records} />;
  else if (clean.startsWith("ceo")) body = <CeoDesk />;
  return <PortalFrame hash={hash || "#pm"}>{body}</PortalFrame>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><RootApp /></React.StrictMode>);
