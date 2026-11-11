import React, { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import { SOURCES } from "../phase1/customer-logic.mjs";
import { KpiTile, LiveChart, type ChartSpec, type KpiModel } from "./charts";
import { buildOverview } from "../server/datasets.mjs";
import { formatCompact, formatFull } from "./format";

type Access = {
  role: "customer" | "dev";
  percent: number;
  brainReady: boolean;
  botsReady: boolean;
  tabs: { id: string; label: string; enabled: boolean }[];
  documents: { id: string; name: string; characters: number }[];
  chunks: number;
  stages: Record<string, { status: string; detail: string }>;
  departments: { id: string; name: string; workflows: string[]; confirmed: boolean }[];
  connectors: { github: { ok: boolean; missing?: string[] }; drive: { ok: boolean; missing?: string[] } };
  residency: { prototype: string; embedding: string; llm: string; production: string };
  finetune: { status: string; detail: string };
  indexLayer?: { retrieval?: string; semantic?: string };
  demo?: { github: string; driveUrl: string; sha?: string; needsReingest?: boolean; drive: { status: string; detail: string } | null; filesTotal: number; filesDone: number; log: { path: string; sample?: boolean }[] };
  quality?: { sha: string; fetchedAt: string; files: Record<string, { path: string; source: string; driveId?: string; rows: number; pass: boolean; schema?: { name: string; type: string }[] }>; cross?: { pass: boolean; checks: { name: string; pass: boolean; detail: string }[] } };
  datasets?: { id: string; rows: number }[];
  model?: { ready: boolean; updated?: string; revenue: { month: string; label: string; line: string; value: number }[]; hours: { department: string; hours: number; available: number; billable: number }[]; stages: { name: string; value: number }[]; risk: { name: string; value: number }[]; winRate: number | null; winRateValue: number | null; weighted: number; targets: { metric: string; subject: string; value: number; unit: string; goodDirection: string }[] };
  opportunities?: { id: string; title: string; impactAed: number; formula: string; confidence: string; owner: string }[];
  pins?: { id: string; type: string; title: string; sample?: boolean; unit?: string; categories?: string[]; series: { name: string; value?: number; values?: number[] }[] }[];
  tasks?: { id: string; title: string; department: string; impactAed: number }[];
  automations?: { id: string; departmentId: string; name: string; enabled: boolean; impactAed?: number | null; runs: { at: string; note: string }[] }[];
  workflowMaps?: Record<string, { flows: { title: string; weeklyHours: number; steps: string[] }[]; friction: string[]; proposals: { id: string; name: string; trigger: string; steps: string[]; chain?: string; tools?: string[]; schedule: string; hoursSavedPerMonth: number; formula: string; impactAed: number | null; aedFormula: string; revenueAngle: string; assumption: string }[] }>;
  llm?: { provider: string; model: string | null; region: string; embedding: string; azure: { missing: string[] } };
};

function faceFor(_id: string) {
  return { bg: "#FFFFFF", fg: "#1A1F24" };
}

function stageClass(id: string, status: string) {
  if (id === "finetune" || status === "blocked" || status === "held") return "attn";
  if (status === "done") return "done";
  if (status === "running" || status === "in_progress") return "run";
  return "wait";
}

function svgProps(size: number) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
}

function StageIcon({ id }: { id: string }) {
  const p = svgProps(26);
  if (id === "ownership") return <svg {...p}><path d="M8 3h8v4H8zM6 7h12v14H6zM9 12h6M9 16h4" /></svg>;
  if (id === "intake") return <svg {...p}><path d="M12 4v10M8 10l4 4 4-4M5 19h14" /></svg>;
  if (id === "parse") return <svg {...p}><path d="M6 4h9l3 3v13H6zM15 4v3h3M8 12h8M8 16h5" /></svg>;
  if (id === "clean") return <svg {...p}><path d="M5 19l4-10 3 6 2-3 5 7" /></svg>;
  if (id === "chunk") return <svg {...p}><path d="M4 7h6v10H4zM14 7h6v4h-6zM14 14h6v3h-6z" /></svg>;
  if (id === "embed") return <svg {...p}><circle cx="8" cy="9" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="12" cy="16" r="2" /><path d="M10 10l2 4M14 10l-2 4" /></svg>;
  if (id === "index") return <svg {...p}><path d="M5 5h14v14H5zM5 10h14M10 10v9" /></svg>;
  if (id === "rag") return <svg {...p}><circle cx="11" cy="11" r="6" /><path d="M16 16l3 3" /></svg>;
  return <svg {...p}><path d="M12 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" /></svg>;
}

function DeptIcon({ id }: { id: string }) {
  const p = svgProps(42);
  if (id === "sales") return <svg {...p}><path d="M5 17l6-6 3 3 5-7" /><path d="M14 7h5v5" /></svg>;
  if (id === "marketing") return <svg {...p}><path d="M4 10v4l10 4V6L4 10zM14 9.5a4 4 0 0 1 0 5" /></svg>;
  if (id === "delivery") return <svg {...p}><path d="M3 8l9-4 9 4-9 4-9-4zM3 8v8l9 4 9-4V8M12 12v8" /></svg>;
  if (id === "technology") return <svg {...p}><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" /></svg>;
  if (id === "finance") return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7v10M9.5 9.5c.6-.8 1.4-1 2.5-1 1.4 0 2.5.7 2.5 2s-1 1.8-2.5 2-2.5.7-2.5 2 1.1 2 2.5 2c1.1 0 1.9-.3 2.5-1" /></svg>;
  if (id === "hr") return <svg {...p}><circle cx="9" cy="9" r="3" /><circle cx="16" cy="10" r="2" /><path d="M4 19c.6-2.5 2.4-4 5-4s4.4 1.5 5 4M14 15c1.4-.4 2.6 0 3.5 1.2" /></svg>;
  if (id === "operations") return <svg {...p}><path d="M4 8h10M4 16h6M14 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM10 16a2 2 0 1 0 4 0 2 2 0 0 0-4 0z" /></svg>;
  if (id === "client-success") return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M8 12l3 3 5-6" /></svg>;
  return <svg {...p}><path d="M12 3l7 3v6c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6z" /></svg>;
}

function Ring({ percent }: { percent: number }) {
  const radius = 68;
  const turn = 2 * Math.PI * radius;
  const done = (Math.min(100, Math.max(0, percent)) / 100) * turn;
  return <div className="ring-wrap">
    <svg viewBox="0 0 180 180" role="img" aria-label={`Build progress ${percent} percent`}>
      <circle cx="90" cy="90" r={radius} fill="none" stroke="#E6EAEE" strokeWidth="14" />
      {done > 0 && <circle cx="90" cy="90" r={radius} fill="none" stroke="#1F5FBF" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${done} ${turn - done}`} transform="rotate(-90 90 90)" />}
    </svg>
    <div className="ring-num">{percent}<small>%</small></div>
  </div>;
}

async function api(path: string, body?: unknown) {
  const response = await fetch(path, { method: body ? "POST" : "GET", credentials: "same-origin", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Request failed"), { data, status: response.status });
  return data;
}

export function BusinessApp() {
  const [hash, setHash] = useState(window.location.hash || "#pm");
  const [state, setState] = useState<Access | null>(null);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [ceoView, setCeoView] = useState(true);
  const [chatOpen, setChatOpen] = useState(() => localStorage.getItem("bos-chat") !== "rail");
  function toggleChat() {
    setChatOpen((value) => {
      localStorage.setItem("bos-chat", value ? "rail" : "open");
      return !value;
    });
  }
  async function reload() {
    try { setState(await api("/api/brain/state")); setError(""); }
    catch (reason) { setError((reason as Error).message); }
  }
  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite");
    const start = invite ? api("/api/brain/claim", { invite }).catch(() => undefined).then(() => { history.replaceState(null, "", "/#pm"); setHash("#pm"); return reload(); }) : reload();
    void start;
    const timer = window.setInterval(reload, 4000);
    const onHash = () => setHash(window.location.hash || "#pm");
    window.addEventListener("hashchange", onHash);
    return () => { window.clearInterval(timer); window.removeEventListener("hashchange", onHash); };
  }, []);
  const raw = hash.replace("#", "") || "pm";
  const tab = raw.startsWith("bots/") ? "bots" : (raw === "dev" || raw === "customer" ? "pm" : raw);
  const current = state?.tabs.find((item) => item.id === tab);
  const allowed = !current || current.enabled;
  const pageName = tab === "brain" ? "Business overview" : tab === "bots" ? "Businessbots" : "BusinessBrain Builder";
  return <div className={`portal ${chatOpen ? "chat-open" : "chat-rail"} ${navOpen ? "nav-open" : ""}`}>
    {navOpen && <button type="button" className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <aside className="side" aria-label="Ethikcorp BusinessOS">
      <div className="side-stick">
      <a className="brand" href="#pm"><span className="mark">EC</span><span><b>Ethikcorp BusinessOS</b></span></a>
      <nav aria-label="Product">{(state?.tabs || [{ id: "pm", label: "BusinessBrain Builder", enabled: true }, { id: "brain", label: "Ethikcorp BusinessBrain", enabled: false }, { id: "bots", label: "Ethikcorp Businessbots", enabled: false }]).map((item) => item.enabled ? <a key={item.id} className={tab === item.id ? "nav on" : "nav"} href={`#${item.id}`} onClick={() => setNavOpen(false)}>{item.label}</a> : <button key={item.id} type="button" className="nav" disabled title="This opens when the build reaches it">{item.label}</button>)}</nav>
      <div className="sidefoot">{state?.role === "dev" ? "Development view. Answer traces stay in the chat." : "CEO view. Locked areas open from live build progress."}</div>
      </div>
    </aside>
    <div className="maincol">
      <header className="topbar">
        <button type="button" className="nav-toggle" aria-label={navOpen ? "Close navigation" : "Open navigation"} onClick={() => setNavOpen((value) => !value)}>Menu</button>
        <div className="ctx"><span>Ethikcorp BusinessOS</span><span aria-hidden="true">/</span><b>{pageName}</b></div>
        <div className="pills">
          <details className="env-pop">
            <summary className="badge neutral">Prototype</summary>
            <div className="pop"><p>{state?.residency.prototype || "This preview is not hosted in the UAE."}</p><p>{state?.llm?.provider === "workers-ai" ? state.llm.model : "No base model connected."}</p></div>
          </details>
          {state?.role === "dev" && <button type="button" className="btn ghost sm ceo-toggle" onClick={() => setCeoView((value) => !value)}>{ceoView ? "CEO view" : "Development view"}</button>}
          <span className="user-menu">{state?.role === "dev" && !ceoView ? "Development" : "CEO"}</span>
        </div>
      </header>
      <div className="page live-pad">
        {!state && <DashboardSkeleton />}
        {error && <div className="banner-need" role="alert">{error}</div>}
        {!allowed && <Locked percent={state?.percent || 0} what={tab} departments={state?.departments || []} />}
        {allowed && tab === "pm" && state && <Project state={state} reload={reload} />}
        {allowed && tab === "brain" && state && <Brain state={state} reload={reload} />}
        {allowed && tab === "bots" && state && <Bots hash={hash} state={state} reload={reload} />}
      </div>
    </div>
    <ChatDock open={chatOpen} onToggle={toggleChat} role={state?.role === "dev" && !ceoView ? "dev" : "customer"} area={tab === "bots" ? "bots" : "brain"} departmentId={raw.startsWith("bots/") ? raw.split("/")[1] : undefined} onResult={(result) => window.dispatchEvent(new CustomEvent("bos-insight", { detail: result }))} />
  </div>;
}

function Locked({ percent, what, departments }: { percent: number; what: string; departments: { confirmed: boolean }[] }) {
  const bots = what === "bots";
  const confirmed = departments.filter((department) => department.confirmed).length;
  const shown = bots ? Math.round((confirmed / 9) * 100) : percent;
  return <div className="lock-stage">
    <div className="lock-preview" aria-hidden="true">
      <div className="bento">
        <article className="tile"><div className="l">{bots ? "Confirmed" : "Indexed"}</div><div className="v">{bots ? confirmed : 0}</div></article>
        <article className="tile"><div className="l">{bots ? "Departments" : "Passages"}</div><div className="v">{bots ? 9 : 0}</div></article>
        <article className="tile"><div className="l">Progress</div><div className="v">{shown}%</div></article>
        <article className="tile"><div className="l">{bots ? "Open" : "Left"}</div><div className="v">{bots ? 9 - confirmed : 0}</div></article>
        <article className="tile span2"><div className="l">{bots ? "Workflows" : "Hours"}</div><div className="v">{bots ? "Templates" : "0"}</div></article>
        <article className="tile span2"><div className="l">Still building</div><div className="v">{shown}%</div></article>
      </div>
    </div>
    <section className="lock-card">
      <div className="lock-badge">Locked</div>
      <div className="eyebrow">Still building</div>
      <h1>{bots ? "Your department Businessbots are being built" : "BusinessBrain is being built"}</h1>
      <Ring percent={shown} />
      <div className="meter" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${shown}%` }} /></div>
      <p className="note">{bots ? `${confirmed} of 9 departments confirmed. This percentage counts confirmed departments. It is not a forecast.` : "This percentage counts finished pipeline stages. It is not a forecast."}</p>
    </section>
  </div>;
}

function Project({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [notice, setNotice] = useState("");
  function speak() {
    const text = `Build progress is ${state.percent} percent. ${state.documents.length} documents are indexed.`;
    if (!("speechSynthesis" in window)) { setNotice("This browser has no speech engine. The status is on screen."); return; }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    setNotice("Speaking with this browser’s voice. No external speech service is used.");
  }
  return <>
    <section className="hero-build">
      <div className="hero-copy">
        <div className="eyebrow">BusinessBrain Builder</div>
        <h1>Build the company brain</h1>
        <p className="sub">Progress is {state.percent}%. {state.documents.length} documents, {state.chunks} passages.</p>
        <button type="button" className="btn" onClick={speak}>Speak status</button>
      </div>
      <div className="hero-ring">
        <Ring percent={state.percent} />
        <p>This percentage counts finished pipeline stages. It is not a forecast.</p>
      </div>
    </section>
    {notice && <p className="note" role="status">{notice}</p>}
    <Outline state={state} />
    <DemoSources state={state} reload={reload} />
    <Ownership reload={reload} />
    <Handoff reload={reload} />
    <section className="card band-card lift"><div className="card-band">Where this prototype runs</div><div className="pad"><p>{state.residency.prototype}</p><p className="note">{state.residency.embedding} {state.residency.llm}</p><p className="note">{state.residency.production}</p><p className="note">About: built by Aqionlabs.ai.</p></div></section>
    {state.role === "dev" && <DevTools state={state} reload={reload} />}
  </>;
}

function Outline({ state }: { state: Access }) {
  const stages: [string, { status: string; detail: string }][] = [
    ["retrieval", { status: state.indexLayer?.retrieval === "built" ? "done" : "not_started", detail: state.indexLayer?.retrieval === "built" ? "Heading-anchored passages are in the retrieval index." : "No passages are indexed yet." }],
    ["semantic", { status: state.indexLayer?.semantic === "built" ? "done" : "not_started", detail: state.model?.targets?.length ? "Synonyms, service-line aliases, KPI definitions, and the sample kpi-targets file." : "Synonyms and KPI definitions are ready. Numeric targets appear after the sample kpi-targets file is indexed." }],
    ["instruction", { status: "done", detail: "training/ethikcorp-businessos-instruct.jsonl is prepared for a later LoRA. No model has been fine-tuned." }],
    ...Object.entries(state.stages),
    ["finetune", { status: "held", detail: state.finetune.detail }]
  ];
  return <section aria-label="Pipeline"><div className="ch"><h2>Pipeline</h2></div>
    <div className="pipe">{stages.map(([id, stage]) => {
      const label = id === "finetune" ? "Not runnable here" : id === "instruction" ? "Prepared, not trained" : stage.status === "done" ? "Done" : stage.status === "running" ? "Running" : "Not started";
      return <article className={`pipe-card ${stageClass(id, stage.status)} lift`} key={id}>
        <div className="pipe-top"><StageIcon id={id} /><b>{id === "finetune" ? "Fine-tune" : id}</b></div>
        <small>{stage.detail}</small>
        <span className="pipe-status">{label}</span>
      </article>;
    })}</div>
  </section>;
}

function DemoSources({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [github, setGithub] = useState(state.demo?.github || "https://github.com/Jaferdecodesai/ethikcorp-businessos-demo-data");
  const [drive, setDrive] = useState(state.demo?.driveUrl || "https://drive.google.com/drive/folders/1sjU5DFEFRSwi1WcJFDz9tPRFwPHouut4");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function ingest() {
    setError("");
    try {
      const plan = await api("/api/brain/demo/plan", { github, drive });
      setBusy(`0 of ${plan.files.length}`);
      for (let index = 0; index < plan.files.length; index += 1) {
        await api("/api/brain/demo/file", { path: plan.files[index].path });
        setBusy(`${index + 1} of ${plan.files.length}: ${plan.files[index].path}`);
        if (index % 4 === 3) await reload();
      }
      await reload();
      setBusy("Indexed.");
    } catch (reason) { setError((reason as Error).message); }
  }
  const done = state.demo?.filesDone || 0;
  const total = state.demo?.filesTotal || 0;
  return <section className="card band-card lift"><div className="card-band sky">Connected sources</div><div className="pad stack">
    <p className="note">These two links are Ethikcorp’s demo sources. GitHub is public. Drive is fetched first and, if Google asks for a sign-in, the preview says so and continues from GitHub.</p>
    <label>GitHub<input aria-label="GitHub demo repository" value={github} onChange={(event) => setGithub(event.target.value)} /></label>
    <label>Google Drive<input aria-label="Google Drive demo folder" value={drive} onChange={(event) => setDrive(event.target.value)} /></label>
    <p>{state.demo?.drive?.detail || "Drive has not been checked yet."}</p>
    <button className="btn" type="button" onClick={ingest} disabled={Boolean(busy && busy !== "Indexed.")}>Ingest demo sources</button>
    {busy && <p role="status">{busy}</p>}
    {error && <p role="alert">{error}</p>}
    <p className="note">1. Sources linked. 2. Files indexed {done}{total ? ` of ${total}` : ""}.</p>
    <div className="meter" role="progressbar" aria-valuenow={total ? Math.round((done / total) * 100) : 0} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} /></div>
    {state.demo?.sha && <p className="note">GitHub commit {state.demo.sha.slice(0, 12)}{state.demo.needsReingest ? ". The commit changed. Ingest again." : "."}</p>}
    {state.quality && <DataQuality quality={state.quality} />}
  </div></section>;
}

function DataQuality({ quality }: { quality: NonNullable<Access["quality"]> }) {
  const files = Object.values(quality.files || {});
  return <div><h3>Data quality</h3><p className="note">Commit {quality.sha?.slice(0, 12) || "unknown"} · fetched {quality.fetchedAt}</p>
    <p className="note">Cross-check {quality.cross?.pass ? "passed" : "failed"}.</p>
    <ul>{quality.cross?.checks?.map((check) => <li key={check.name}>{check.pass ? "Passed" : "Failed"} · {check.detail}</li>)}</ul>
    <ul>{files.filter((file) => file.rows).map((file) => <li key={file.path}>{file.pass ? "Passed" : "Failed"} · {file.path} · {file.rows} rows · {file.source}{file.driveId ? ` · Drive ${file.driveId}` : ""} · {file.schema?.map((column) => `${column.name}:${column.type}`).join(", ")}</li>)}</ul>
  </div>;
}

function Ownership({ reload }: { reload: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  return <section className="card band-card lift"><div className="card-band coral">1. Source ownership</div><div className="pad"><p className="note">Upload the completed .xlsx. All 18 sources must be present. Row errors stay on screen and nothing is stored until the file is valid.</p>
    <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      const file = new FormData(event.currentTarget).get("file");
      if (!(file instanceof File)) return;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      try { await api("/api/brain/ownership", { xlsxBase64: btoa(binary) }); setMessage("Ownership imported."); await reload(); }
      catch (reason) { const errors = (reason as { data?: { errors?: { message: string }[] } }).data?.errors; setMessage(errors ? errors.map((item) => item.message).join(" ") : (reason as Error).message); }
    }}>
      <input aria-label="Ownership workbook" name="file" type="file" accept=".xlsx" required />
      <button className="btn" type="submit">Import ownership</button>
    </form>
    {message && <p role="status">{message}</p>}
    <p className="note">{SOURCES.length} catalogue sources, including {SOURCES.filter((source) => source.notForAi).map((source) => source.title).join(" and ")} marked not for AI.</p>
    </div></section>;
}

function Handoff({ reload }: { reload: () => Promise<void> }) {
  const [name, setName] = useState("services.md");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  return <section className="card band-card lift"><div className="card-band sky">2. Document handoff</div><div className="pad"><p className="note">UTF-8 text or Markdown is parsed, cleaned, chunked, embedded, and indexed immediately. PDF and Office files are refused until a parser is connected.</p>
    <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      try { await api("/api/brain/documents", { name, text }); setMessage(`${name} is indexed.`); setText(""); await reload(); }
      catch (reason) { setMessage((reason as Error).message); }
    }}>
      <label>File name<input aria-label="File name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Text<textarea aria-label="Document text" rows={5} value={text} onChange={(event) => setText(event.target.value)} required /></label>
      <button className="btn" type="submit">Index document</button>
    </form>
    {message && <p role="status">{message}</p>}
    </div></section>;
}

function DevTools({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [link, setLink] = useState("");
  return <section className="card band-card lift"><div className="card-band sky">Development pipeline</div><div className="pad">
    <p>Collection, cleaning, parsing, chunking, embedding, vectors, RAG, evaluation, and connectors are the stages above. Fine-tuning is listed and is not running.</p>
    <p className="note">GitHub: {state.connectors.github.ok ? "token present" : `missing ${state.connectors.github.missing?.join(", ")}`}. Drive: {state.connectors.drive.ok ? "OAuth present" : `missing ${state.connectors.drive.missing?.join(", ")}`}. No files are fetched from either until those credentials exist.</p>
    <button type="button" className="btn ghost" onClick={async () => { const result = await api("/api/brain/bootstrap-dev", {}); setLink(result.url || result.error || ""); }}>Issue the development invite</button>
    {link && <p className="note">Give this URL only to the development team. It is signed with the existing session secret.</p>}
    {link && <p><a href={link}>{link}</a></p>}
    <div className="ch"><h2>Confirm departments</h2></div>
    {state.departments.map((department) => <div className="plainrow" key={department.id}><span className="navdot" style={{ background: faceFor(department.id).bg, width: 14, height: 14, boxShadow: "inset 0 0 0 1.5px #03050A" }} /><span><b>{department.name}</b><small>{department.workflows.join(", ")}</small></span><button type="button" className="btn sm" disabled={department.confirmed} onClick={async () => { await api("/api/brain/confirm", { id: department.id }); await reload(); }}>{department.confirmed ? "Confirmed" : "Confirm"}</button></div>)}
    </div></section>;
}

type Insight = {
  answer?: string;
  error?: string;
  view?: string;
  period?: string | null;
  chartId?: string;
  bullets?: { label: string; value: number; unit?: string }[];
  fixes?: Access["opportunities"];
  steps?: { tool: string; detail: string }[];
  refused?: boolean;
  citations?: { document: string; excerpt: string }[];
};

const PROMPTS = ["Revenue by service line, last 6 months", "Department utilisation", "Where can we make AED 1M more?"];

function Brain({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [period, setPeriod] = useState("last-6");
  const [mode, setMode] = useState("revenue");
  const [highlight, setHighlight] = useState("");
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ period: string; mode: string; filter: string | null } | null>(null);
  const [banner, setBanner] = useState(() => sessionStorage.getItem("bos-sample-banner") !== "off");
  const [fixes, setFixes] = useState(state.opportunities || []);
  useEffect(() => { setFixes(state.opportunities || []); }, [state.opportunities]);
  useEffect(() => {
    const onInsight = (event: Event) => {
      const detail = (event as CustomEvent<Insight>).detail;
      if (!detail || detail.error || detail.refused) return;
      if (detail.view) {
        setUndo({ period, mode, filter });
        setMode(detail.view);
        if (detail.period) setPeriod(detail.period);
        setFilter(filterLabel(detail.view));
        const id = detail.chartId && document.getElementById(detail.chartId) ? detail.chartId : chartIdFor(detail.view);
        setHighlight(id);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }), 50);
        window.setTimeout(() => setHighlight(""), reduce ? 3000 : 1600);
      }
      if (detail.fixes) setFixes(detail.fixes);
    };
    const onPending = (event: Event) => setPending(Boolean((event as CustomEvent<boolean>).detail));
    const onUndo = () => {
      if (!undo) return;
      setPeriod(undo.period);
      setMode(undo.mode);
      setFilter(undo.filter);
      setUndo(null);
    };
    window.addEventListener("bos-insight", onInsight);
    window.addEventListener("bos-pending", onPending);
    window.addEventListener("bos-undo", onUndo);
    return () => {
      window.removeEventListener("bos-insight", onInsight);
      window.removeEventListener("bos-pending", onPending);
      window.removeEventListener("bos-undo", onUndo);
    };
  }, [period, mode, filter, undo]);
  const overview = state.model?.ready ? buildOverview(state.model, { period, mode, actions: fixes }) : null;
  return <div className="board">
    <header className="page-head">
      <h1>Business overview</h1>
      <p className="sub">Recognised revenue, pipeline, utilisation and win rate from the indexed sample tables.</p>
      <div className="controls">
        <label>Period<select aria-label="Period" value={overview?.period || period} onChange={(event) => { setPeriod(event.target.value); setFilter(null); }}>{(overview?.periods || [{ id: "last-6", label: "May–Oct 2026" }]).map((item: { id: string; label: string }) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <span className="note">Currency AED</span>
        {state.model?.updated && <span className="note">{updatedLabel(state.model.updated)}</span>}
      </div>
      {banner && <div className="info-banner" role="status"><span>Sample data — figures are illustrative until live sources are connected.</span><button type="button" onClick={() => { sessionStorage.setItem("bos-sample-banner", "off"); setBanner(false); }}>Dismiss</button></div>}
      {filter && <div className="filter-pill">Filtered by chat: {filter} <button type="button" onClick={() => window.dispatchEvent(new Event("bos-undo"))}>Undo</button></div>}
    </header>
    {!overview && <section className="card pad empty-card"><h2>No revenue recorded yet</h2><p>Ingest the demo sources to load the sample tables. Nothing is invented before those files are indexed.</p></section>}
    {overview && <div className="kpi-row">{(overview.kpis as KpiModel[]).map((kpi) => <KpiTile key={kpi.id} kpi={kpi} onSelect={() => { setMode(kpi.mode || "revenue"); setFilter(null); }} />)}</div>}
    {overview && <div className="chart-row">{(overview.charts as ChartSpec[]).map((chart) => <div className={`chart-card span-${chart.span || 6} ${highlight === chart.id ? "flash" : ""} ${pending ? "pending" : ""}`} key={chart.id}><LiveChart spec={chart} /></div>)}</div>}
    {overview && !overview.charts.length && <section className="card pad empty-card"><h2>No rows for this view</h2><button type="button" className="btn ghost" onClick={() => setPeriod("last-6")}>Change period</button></section>}
    <OpportunityList items={fixes} reload={reload} title="Revenue fixes" />
  </div>;
}

function chartIdFor(view: string) {
  if (view === "utilisation") return "chart-utilisation";
  if (view === "pipeline") return "chart-pipeline";
  if (view === "risk") return "chart-risk";
  if (view === "actions") return "chart-actions";
  if (view === "donut") return "chart-revenue-share";
  return "chart-revenue-lines";
}

function filterLabel(view: string) {
  if (view === "utilisation") return "Utilisation · October 2026";
  if (view === "pipeline") return "Pipeline";
  if (view === "risk") return "Deals below 40%";
  if (view === "actions") return "Revenue actions";
  if (view === "donut") return "Share of revenue";
  return "Revenue · May–Oct 2026";
}

function updatedLabel(iso: string) {
  const text = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
  return `Last updated ${text} (UTC+4)`;
}

function DashboardSkeleton() {
  return <div className="board" aria-hidden="true">{[0, 1, 2, 3].map((item) => <div className="skeleton tile" key={item}><span /><span /><span /></div>)}<div className="skeleton chart" /><div className="skeleton chart" /></div>;
}

function OpportunityList({ items, reload, title }: { items: NonNullable<Access["opportunities"]>; reload: () => Promise<void>; title: string }) {
  if (!items.length) return null;
  return <section className="card pad span-12 fixes-card"><div className="ch"><h2>{title}</h2><span className="badge neutral">Sample</span></div><div className="fixes">{items.slice(0, 4).map((item) => <article className="fix" key={item.id}><h3>{item.title}</h3><div className="impact">{item.impactAed == null ? "—" : formatFull(item.impactAed, "AED")}</div><p className="note">{item.confidence} · {item.owner}</p><details className="how"><summary>How we calculated</summary><p>{item.formula}</p></details><button type="button" className="btn ghost sm" onClick={async () => { await api("/api/brain/task", item); await reload(); }}>Create task</button></article>)}</div></section>;
}

function Bots({ hash, state, reload }: { hash: string; state: Access; reload: () => Promise<void> }) {
  const parts = hash.replace("#", "").split("/");
  const selected = parts[1];
  const process = parts[2] === "process";
  const department = catalog.find((item) => item.id === selected);
  if (!department) return <div className="dept-grid">{catalog.map((item) => {
    const weekly = (state.workflowMaps?.[item.id]?.flows || []).reduce((sum, flow) => sum + (flow.weeklyHours || 0), 0);
    return <a className="dept-card" key={item.id} href={`#bots/${item.id}`}>
      <div className="dept-face"><DeptIcon id={item.id} /><div><div className="dept-kicker">{item.code}</div>{weekly ? <div className="dept-metric">{weekly.toLocaleString("en-AE", { maximumFractionDigits: 1 })} h</div> : <div className="dept-metric">—</div>}<div className="dept-kicker">{weekly ? "Sample hours / week" : "Not measured"}</div></div></div>
      <div className="dept-body"><h2>{item.name}</h2><p>{item.mandate}</p>{!weekly && <span className="badge neutral">Not measured</span>}</div>
    </a>;
  })}</div>;
  return <>
    <header className="page-head">
      <p className="note"><a href="#bots">Businessbots</a> / {department.name}</p>
      <h1>{department.name}</h1>
      <p className="sub">{department.mandate}</p>
      <div className="controls"><a className="btn ghost" href="#bots">All departments</a><a className="btn ghost" href={`#bots/${department.id}/process`}>Process detail</a><span className={state.departments.find((item) => item.id === department.id)?.confirmed ? "badge success" : "badge neutral"}>{state.departments.find((item) => item.id === department.id)?.confirmed ? "Confirmed" : "Not confirmed"}</span></div>
    </header>
    <BotDesk departmentId={department.id} process={process} state={state} reload={reload} />
    {state.role === "dev" && <button type="button" className="btn" onClick={async () => { await api("/api/brain/confirm", { id: department.id }); await reload(); }}>Confirm this department</button>}
  </>;
}

function BotDesk({ departmentId, process, state, reload }: { departmentId: string; process: boolean; state: Access; reload: () => Promise<void> }) {
  const map = state.workflowMaps?.[departmentId];
  const saved = (state.automations || []).filter((item) => item.departmentId === departmentId);
  const partners = state.departments.filter((item) => item.id !== departmentId);
  const spec = map ? processSpec(map) : null;
  return <div className="board">
    {spec ? <div className="chart-card span-12"><LiveChart spec={spec} /></div> : <p className="note span-12">Ingest the demo sources to load this department’s workflow file.</p>}
    {process && map?.flows?.filter((flow) => flow.steps.length).map((flow) => <section className="card pad span-12" key={flow.title}><h2>{flow.title}</h2><p className="note">{flow.weeklyHours} h / week in the sample workflow file.</p><ol className="step-list">{flow.steps.map((step, index) => <li key={step}><b>{index + 1}.</b> <span>{sentence(step)}</span>{isBottleneck(step, map.friction || []) && <span className="badge low">▼ Bottleneck</span>}</li>)}</ol></section>)}
    {map?.proposals?.length ? <section className="card pad span-12"><div className="ch"><h2>Proposed automations</h2><span className="badge neutral">Sample</span></div><div className="fixes">{map.proposals.map((item) => <article className="fix" key={item.id}><h3>{item.name}</h3><ol className="step-list">{(item.steps || []).slice(0, 5).map((step, index) => <li key={step}><b>{index + 1}.</b> <span>{sentence(step)}</span></li>)}</ol><p className="note">{item.hoursSavedPerMonth} h / month. Tools: {item.tools?.join(", ") || "department checklist"}.</p><div className="impact">{item.impactAed == null ? "—" : `${formatFull(item.impactAed, "AED")} / month`}</div><p>{item.revenueAngle}</p><details className="how"><summary>How we calculated</summary><p>{item.assumption}. {item.formula}. {item.aedFormula}</p></details>{state.role === "dev" && <button type="button" className="btn" onClick={async () => { await api("/api/brain/automation", item); await reload(); }}>Build automation</button>}</article>)}</div></section> : null}
    {saved.length > 0 && <section className="card pad span-12"><div className="ch"><h2>Automations</h2><span className="badge neutral">Sample</span></div>{saved.map((item) => <div className="plainrow" key={item.id}><span /><span><b>{item.name}</b><small>{item.impactAed ? `${formatFull(item.impactAed, "AED")} / month. ` : ""}{item.runs.map((run) => run.note).join(" ") || "No runs yet."}</small></span><span><button type="button" className="btn ghost" onClick={async () => { await api("/api/brain/automation/toggle", { id: item.id }); await reload(); }}>{item.enabled ? "On" : "Off"}</button> <button type="button" className="btn" onClick={async () => { await api("/api/brain/automation/run", { id: item.id }); await reload(); }}>Simulated run</button></span></div>)}</section>}
    <section className="card pad span-12"><div className="ch"><h2>Partner departments</h2></div>{partners.map((item) => <div className="plainrow" key={item.id}><span /><span><b>{item.name}</b><small>{item.confirmed ? "Confirmed" : "Not confirmed"}</small></span><span className={item.confirmed ? "badge success" : "badge neutral"}>{item.confirmed ? "Confirmed" : "Waiting"}</span></div>)}</section>
  </div>;
}

function processSpec(map: NonNullable<Access["workflowMaps"]>[string]): ChartSpec {
  const series = map.flows.filter((flow) => flow.steps.length).flatMap((flow) => {
    const each = flow.weeklyHours / Math.max(1, flow.steps.length);
    return flow.steps.map((step) => ({ name: step, value: Math.round(each * 10) / 10, belowTarget: isBottleneck(step, map.friction || []), statusLabel: "Bottleneck" }));
  }).sort((left, right) => right.value - left.value);
  const top = series[0];
  return { id: "chart-process-hours", type: "bar", title: "Hours per week by step", unit: "h", sample: true, span: 12, series, aria: top ? `Hours per week by step. Highest: ${top.name} ${top.value} h.` : "Hours per week by step." };
}

function sentence(value: string) {
  const text = value.replace(/\.$/, "").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function isBottleneck(step: string, friction: string[]) {
  const words = friction.join(" ").toLowerCase().match(/[a-z]{7,}/g) || [];
  const text = step.toLowerCase();
  return words.some((word) => text.includes(word.slice(0, 7)));
}

type ChatLine = { who: string; text?: string; bullets?: { label: string; value: number; unit?: string }[]; steps?: { tool: string; detail: string }[]; chartId?: string; chartLabel?: string; error?: boolean; retry?: string };

function ChatDock({ open, onToggle, role, area, departmentId, onResult }: { open: boolean; onToggle: () => void; role: "customer" | "dev"; area: string; departmentId?: string; onResult: (result: Insight) => void }) {
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([{ who: "BusinessBrain", text: "Ask a question about your business. Charts update with the answer." }]);
  const showThread = open || sheet;
  async function ask(event?: React.FormEvent, preset?: string) {
    event?.preventDefault();
    const question = (preset || text).trim();
    if (!question || asking) return;
    setText("");
    setSheet(true);
    if (!open) onToggle();
    setAsking(true);
    window.dispatchEvent(new CustomEvent("bos-pending", { detail: true }));
    setLines((prev) => [...prev, { who: "You", text: question }, { who: "BusinessBrain", text: "Analysing…" }]);
    const steps: { tool: string; detail: string }[] = [];
    try {
      const response = await fetch("/api/brain/ask", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ question, area, departmentId }) });
      if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("ndjson")) {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Request failed");
        finish(result, steps, question);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const event = JSON.parse(part);
          if (event.type === "step") steps.push(event.step);
          if (event.type === "done") finish(event, steps, question);
        }
      }
    } catch {
      setLines((prev) => prev.filter((line) => line.text !== "Analysing…").concat({ who: "BusinessBrain", text: "Couldn't get an answer. Your dashboard hasn't changed.", error: true, retry: question }));
    } finally {
      setAsking(false);
      window.dispatchEvent(new CustomEvent("bos-pending", { detail: false }));
    }
  }
  function finish(result: Insight, steps: { tool: string; detail: string }[], question: string) {
    if (result.error) {
      setLines((prev) => prev.filter((line) => line.text !== "Analysing…").concat({ who: "BusinessBrain", text: "Couldn't get an answer. Your dashboard hasn't changed.", error: true, retry: question }));
      return;
    }
    if (!result.refused) onResult({ ...result, steps });
    const chartLabel = result.view ? filterLabel(result.view) : "";
    setLines((prev) => prev.filter((line) => line.text !== "Analysing…").concat({ who: "BusinessBrain", text: result.bullets?.length ? undefined : result.answer, bullets: result.bullets, steps: role === "dev" ? steps : undefined, chartId: result.refused ? undefined : chartIdFor(result.view || "revenue"), chartLabel: result.refused ? undefined : chartLabel }));
  }
  return <aside className={`chat-panel ${sheet ? "sheet-open" : ""}`} aria-label="BusinessBrain chat">
    <header className="chat-head">
      <b>BusinessBrain</b>
      <button type="button" className="btn ghost sm" onClick={() => { setLines([{ who: "BusinessBrain", text: "Ask a question about your business. Charts update with the answer." }]); }}>New conversation</button>
      <button type="button" className="btn ghost sm" aria-expanded={open} onClick={onToggle}>{open ? "Collapse" : "Ask BusinessBrain"}</button>
    </header>
    {showThread && <div className="chat-log">{lines.map((line, index) => <article className={line.who === "You" ? "bubble you" : "bubble"} key={index}>
      {line.who !== "You" && <span className="avatar" aria-hidden="true">EC</span>}
      <div>
        {line.text === "Analysing…" ? <div className="skeleton lines" aria-live="polite"><span /><span /><span /><small>Analysing…</small></div> : null}
        {line.bullets?.length ? <ul className="figure-list">{line.bullets.slice(0, 5).map((item) => <li key={item.label}><span>{item.label}</span><b>{formatFull(Number(item.value), item.unit)}</b></li>)}</ul> : line.text && line.text !== "Analysing…" ? <p>{line.text}</p> : null}
        {line.chartId && <button type="button" className="chip" onClick={() => document.getElementById(line.chartId || "")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Updated: {line.chartLabel}</button>}
        {line.chartId && <button type="button" className="linkish" onClick={() => window.dispatchEvent(new Event("bos-undo"))}>Undo</button>}
        {line.error && line.retry && <button type="button" className="btn ghost sm" onClick={() => ask(undefined, line.retry)}>Try again</button>}
        {role === "dev" && line.steps?.length ? <details className="trace"><summary>How this answer was produced</summary><ol>{line.steps.map((step, stepIndex) => <li key={stepIndex}><b>{step.tool}</b> {step.detail}</li>)}</ol></details> : null}
      </div>
    </article>)}
    {(lines.length <= 1 || lines[lines.length - 1]?.who === "BusinessBrain") && !asking && <div className="prompts">{PROMPTS.map((prompt) => <button type="button" className="chip" key={prompt} onClick={() => ask(undefined, prompt)}>{prompt}</button>)}</div>}
    </div>}
    <form className="ask" onSubmit={ask}>
      <textarea aria-label="Question" rows={1} value={text} placeholder="Ask about revenue, pipeline or utilisation" onFocus={() => setSheet(true)} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} />
      <button className="btn" type="submit" disabled={asking}>Ask</button>
    </form>
  </aside>;
}
