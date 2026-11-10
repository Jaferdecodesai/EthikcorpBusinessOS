import React, { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import { SOURCES } from "../phase1/customer-logic.mjs";
import { ceoDashboard } from "../server/ceo-dashboard.mjs";
import { BarList, LiveChart } from "./charts";

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
  demo?: { github: string; driveUrl: string; drive: { status: string; detail: string } | null; filesTotal: number; filesDone: number; log: { path: string; sample?: boolean }[] };
  datasets?: { id: string; rows: number }[];
  opportunities?: { id: string; title: string; impactAed: number; formula: string; confidence: string; owner: string }[];
  pins?: { id: string; type: string; title: string; sample?: boolean; unit?: string; categories?: string[]; series: { name: string; value?: number; values?: number[] }[] }[];
  tasks?: { id: string; title: string; department: string; impactAed: number }[];
  automations?: { id: string; departmentId: string; name: string; enabled: boolean; impactAed?: number | null; runs: { at: string; note: string }[] }[];
  workflowMaps?: Record<string, { flows: { title: string; weeklyHours: number; steps: string[] }[]; friction: string[]; proposals: { id: string; name: string; trigger: string; steps: string[]; schedule: string; hoursSavedPerMonth: number; formula: string; impactAed: number | null; aedFormula: string; revenueAngle: string; assumption: string }[] }>;
  llm?: { provider: string; model: string | null; region: string; embedding: string; azure: { missing: string[] } };
};

const dash = ceoDashboard();

const FACE_CYCLE = ["#09A5EC", "#FD7152", "#D6FD21"];
const BAR_CYCLE = ["#09A5EC", "#FD7152", "#D6FD21"];

function faceFor(id: string) {
  const index = catalog.findIndex((item) => item.id === id);
  return { bg: FACE_CYCLE[(index < 0 ? 0 : index) % FACE_CYCLE.length], fg: "#03050A" };
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

function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(0.01, ...values);
  const width = 120;
  const height = 48;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 4 - (value / max) * (height - 8);
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  return <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><polygon points={area} fill={color} opacity="0.16" /><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function Ring({ percent }: { percent: number }) {
  const radius = 68;
  const turn = 2 * Math.PI * radius;
  const done = (Math.min(100, Math.max(0, percent)) / 100) * turn;
  return <div className="ring-wrap">
    <svg viewBox="0 0 180 180" role="img" aria-label={`Build progress ${percent} percent`}>
      <circle cx="90" cy="90" r={radius} fill="none" stroke="#03050A" strokeWidth="18" />
      <circle cx="90" cy="90" r={radius} fill="none" stroke="#09A5EC" strokeWidth="14" />
      {done > 0 && <circle cx="90" cy="90" r={radius} fill="none" stroke="#D6FD21" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${done} ${turn - done}`} transform="rotate(-90 90 90)" />}
    </svg>
    <div className="ring-num">{percent}<small>%</small></div>
  </div>;
}

function TrendLine({ points }: { points: { week: string; netHours: number }[] }) {
  const max = Math.max(1, ...points.map((point) => point.netHours));
  const width = 360;
  const height = 120;
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * (width - 16) + 8;
    const y = height - 18 - (point.netHours / max) * (height - 32);
    return [x, y] as const;
  });
  const d = coords.map((pair, index) => `${index ? "L" : "M"}${pair[0]},${pair[1]}`).join(" ");
  return <svg className="trend" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={points.map((point) => `${point.week} ${point.netHours}`).join(", ")}>
    <path d={d} fill="none" stroke="#03050A" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
    {coords.map((pair, index) => <circle key={points[index].week} cx={pair[0]} cy={pair[1]} r="4.5" fill="#03050A" />)}
  </svg>;
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
  return <div className="portal">
    <aside className="side" aria-label="Ethikcorp BusinessOS">
      <div className="side-stick">
      <a className="brand" href="#pm"><span className="mark">EC</span><span><b>Ethikcorp BusinessOS</b><small>Built by Aqionlabs.ai</small></span></a>
      <nav aria-label="Product">{(state?.tabs || [{ id: "pm", label: "BusinessBrain Builder", enabled: true }, { id: "brain", label: "Ethikcorp BusinessBrain", enabled: false }, { id: "bots", label: "Ethikcorp Businessbots", enabled: false }]).map((item) => item.enabled ? <a key={item.id} className={tab === item.id ? "nav on" : "nav"} href={`#${item.id}`}><i className={`navdot ${item.id}`} />{item.label}</a> : <button key={item.id} type="button" className="nav" disabled title="This opens when the build reaches it"><i className={`navdot ${item.id}`} />{item.label}</button>)}</nav>
      <div className="sidefoot">{state?.role === "dev" ? "Development team. All three areas are open." : "Customer view. Locked areas open from live build progress."}</div>
      </div>
    </aside>
    <div className="maincol">
      <header className="topbar">
        <div className="ctx"><span>Ethikcorp BusinessOS</span><span aria-hidden="true">/</span><b>{tab === "brain" ? "BusinessBrain" : tab === "bots" ? "Businessbots" : "BusinessBrain Builder"}</b></div>
        <div className="pills"><span className="pill a"><i />Prototype · not UAE-hosted</span><span className="pill badge"><i />No base model connected</span></div>
      </header>
      <div className="page live-pad">
        {error && <div className="banner-need" role="alert">{error}</div>}
        {!allowed && <Locked percent={state?.percent || 0} what={tab} departments={state?.departments || []} />}
        {allowed && tab === "pm" && state && <Project state={state} reload={reload} />}
        {allowed && tab === "brain" && state && <Brain state={state} reload={reload} />}
        {allowed && tab === "bots" && state && <Bots hash={hash} state={state} reload={reload} />}
      </div>
    </div>
  </div>;
}

function Locked({ percent, what, departments }: { percent: number; what: string; departments: { confirmed: boolean }[] }) {
  const bots = what === "bots";
  const confirmed = departments.filter((department) => department.confirmed).length;
  const shown = bots ? Math.round((confirmed / 9) * 100) : percent;
  return <div className="lock-stage">
    <div className="lock-preview" aria-hidden="true">
      <div className="bento">
        <article className="tile sky"><div className="l">{bots ? "Confirmed" : "Indexed"}</div><div className="v">{bots ? confirmed : 0}</div></article>
        <article className="tile lime"><div className="l">{bots ? "Departments" : "Passages"}</div><div className="v">{bots ? 9 : 0}</div></article>
        <article className="tile coral"><div className="l">Progress</div><div className="v">{shown}%</div></article>
        <article className="tile sky"><div className="l">{bots ? "Open" : "Left"}</div><div className="v">{bots ? 9 - confirmed : 0}</div></article>
        <article className="tile lime span2"><div className="l">{bots ? "Workflows" : "Hours"}</div><div className="v">{bots ? "Templates" : "0"}</div></article>
        <article className="tile coral span2"><div className="l">Still building</div><div className="v">{shown}%</div></article>
        <article className="tile sky"><div className="l">Build</div><div className="v">{shown}</div></article>
        <article className="tile lime"><div className="l">Ready</div><div className="v">{bots ? confirmed : 0}</div></article>
        <article className="tile coral span2"><div className="l">Attention</div><div className="v">{bots ? 9 - confirmed : 0}</div></article>
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
    <section className="card band-card lift"><div className="card-band coral">Where this prototype runs</div><div className="pad"><p>{state.residency.prototype}</p><p className="note">{state.residency.embedding} {state.residency.llm}</p><p className="note">{state.residency.production}</p></div></section>
    {state.role === "dev" && <DevTools state={state} reload={reload} />}
  </>;
}

function Outline({ state }: { state: Access }) {
  const stages = [...Object.entries(state.stages), ["finetune", { status: "held", detail: state.finetune.detail }] as const];
  return <section aria-label="Pipeline"><div className="ch"><h2>Pipeline</h2></div>
    <div className="pipe">{stages.map(([id, stage]) => {
      const label = id === "finetune" ? "Not runnable here" : stage.status === "done" ? "Done" : stage.status === "running" ? "Running" : "Not started";
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
  </div></section>;
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

function Brain({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [insight, setInsight] = useState<{ chart?: Access["pins"] extends (infer T)[] | undefined ? T : never; fixes?: Access["opportunities"]; steps?: { tool: string; detail: string }[] } | null>(null);
  const hourRows = dash.hourBars.map((row, index) => ({ ...row, note: "estimate", color: BAR_CYCLE[index % BAR_CYCLE.length] }));
  return <>
    <header className="greet">
      <div>
        <div className="eyebrow">Ethikcorp BusinessBrain</div>
        <h1>The company, in one view.</h1>
        <p className="sub">Ask from indexed documents. {state.llm?.region || "Cloudflare Workers AI – not UAE-resident; UAE North option ready"} {state.llm?.provider === "workers-ai" ? state.llm.model : "Base model: not connected on this preview."}</p>
      </div>
      <div className="greet-stat"><span className="sample-badge">SAMPLE DATA</span><b>{dash.company.netHoursPerWeek}</b><span>Sample net hours / week. Not measured.</span></div>
    </header>
    <OpportunityList items={state.opportunities || []} reload={reload} title="Top revenue opportunities" />
    {(state.pins || []).length > 0 && <section className="card pad" style={{ marginTop: 16 }}><div className="ch"><h2>Pinned insights</h2></div><div className="grid g2">{state.pins?.map((chart) => <LiveChart key={chart.id} spec={chart} />)}</div></section>}
    {insight?.chart && <section className="card pad insight"><div className="ch"><h2>Live insight</h2><button type="button" className="btn sm" onClick={async () => { await api("/api/brain/pin", { chart: insight.chart }); await reload(); }}>Pin to dashboard</button></div><LiveChart spec={insight.chart} />{insight.steps && <ol className="steps">{insight.steps.map((step, index) => <li key={index}><b>{step.tool}</b> {step.detail}</li>)}</ol>}</section>}
    <div className="bento">
      <article className="tile sky lift"><div className="l">Indexed documents</div><div className="v">{state.documents.length}</div></article>
      <article className="tile lime lift"><div className="l">Passages</div><div className="v">{state.chunks}</div></article>
      <article className="tile sky lift"><div className="l">Demo tasks</div><div className="v">{dash.company.tasksDone}/{dash.company.tasksOpen}</div><div className="x">Sample snapshot</div></article>
      <article className="tile coral lift"><div className="l">Model</div><div className="v" style={{ fontSize: 28 }}>Not connected</div></article>
      <section className="card band-card lift span2"><div className="card-band sky">Sample net hours</div><div className="pad"><BarList bold caption="Sample net hours per week from the setup model. Not measured." rows={hourRows} /></div></section>
      <section className="card band-card lift span2"><div className="card-band coral">Lead mix</div><div className="pad"><div className="mix">{dash.pipeline.map((item) => <div className={`mix-cell ${item.label.toLowerCase()}`} key={item.label}><b>{item.value}</b><span>{item.label}</span></div>)}</div><p className="note">{dash.pipelineNote}</p></div></section>
      <article className="tile lime lift span2"><div className="l">Illustrative week</div><TrendLine points={dash.trend} /><div className="x">{dash.trendNote}</div></article>
      <article className="tile lime lift"><div className="l">Automations</div><div className="v">{dash.company.automations}</div><div className="x">Setup model. Not running.</div></article>
      <article className="tile coral lift"><div className="l">ClickUp</div><div className="v">{dash.company.clickupOpenTasks}</div><div className="x">Open tasks. Sample snapshot.</div></article>
      <article className="tile sky lift"><div className="l">People</div><div className="v">{dash.company.employees}</div><div className="x">Demo snapshot.</div></article>
      <article className="tile lime lift"><div className="l">Hours logged</div><div className="v">{dash.company.hoursLogged}</div><div className="x">Sample snapshot.</div></article>
      <article className="tile coral lift"><div className="l">Demo hours saved</div><div className="v">{dash.company.hoursSavedDemo}</div><div className="x">Not measured.</div></article>
      <article className="tile sky lift"><div className="l">Runs / week</div><div className="v">{dash.company.runsPerWeek}</div><div className="x">Sample model.</div></article>
    </div>
    <ChatDock area="brain" onResult={(result) => setInsight(result)} />
    {insight?.fixes && <OpportunityList items={insight.fixes} reload={reload} title="Revenue fixes" />}
  </>;
}

function OpportunityList({ items, reload, title }: { items: NonNullable<Access["opportunities"]>; reload: () => Promise<void>; title: string }) {
  if (!items.length) return null;
  return <section className="card pad" style={{ marginTop: 16 }}><div className="ch"><h2>{title}</h2><span className="sample-badge">SAMPLE DATA</span></div><div className="fixes">{items.slice(0, 4).map((item) => <article className="fix" key={item.id}><h3>{item.title}</h3><div className="impact">{item.impactAed == null ? "—" : `AED ${item.impactAed.toLocaleString("en-AE")}`}</div><p>{item.formula}</p><p className="note">{item.confidence} · {item.owner}</p><button type="button" className="btn sm" onClick={async () => { await api("/api/brain/task", item); await reload(); }}>Create task</button></article>)}</div></section>;
}

function Bots({ hash, state, reload }: { hash: string; state: Access; reload: () => Promise<void> }) {
  const selected = hash.split("/")[1];
  const department = catalog.find((item) => item.id === selected);
  if (!department) return <div className="dept-grid">{catalog.map((item) => {
    const face = faceFor(item.id);
    const sample = dash.departments.find((row) => row.id === item.id);
    const hours = sample?.netHoursPerWeek ?? 0;
    const spark = dash.trend.map((point) => point.netHours * (dash.company.netHoursPerWeek ? hours / dash.company.netHoursPerWeek : 0));
    return <a className="dept-card lift" key={item.id} href={`#bots/${item.id}`}>
      <div className="dept-face" style={{ background: face.bg, color: face.fg }}><div className="dept-face-row"><DeptIcon id={item.id} /><div><div className="dept-kicker">{item.code}</div><div className="dept-metric">{hours}</div><div className="dept-kicker">Sample net h/week</div></div></div><Spark values={spark} color="#03050A" /></div>
      <div className="dept-body"><h2>{item.name}</h2><p>{item.mandate}</p></div>
    </a>;
  })}</div>;
  const face = faceFor(department.id);
  return <>
    <header className="dept-hero" style={{ background: face.bg, color: face.fg }}><div><div className="dept-kicker">{department.code}</div><h1>{department.name}</h1><p className="sub" style={{ color: "inherit" }}>{department.mandate}</p></div><a className="btn ghost" href="#bots">All departments</a></header>
    <BotDesk departmentId={department.id} state={state} reload={reload} />
    <section className="card pad"><div className="ch"><h2>Workflows</h2><span className={state.departments.find((item) => item.id === department.id)?.confirmed ? "state-chip done" : "state-chip attn"}>{state.departments.find((item) => item.id === department.id)?.confirmed ? "Confirmed by the development team" : "Not confirmed"}</span></div>
      {department.workflows.map((workflow) => <div className="plainrow" key={workflow.id}><span /><span><b>{workflow.name}</b><small>{workflow.description}</small></span><span className="note">Template · not running</span></div>)}
    </section>
    {state.role === "dev" && <button type="button" className="btn" onClick={async () => { await api("/api/brain/confirm", { id: department.id }); await reload(); }}>Confirm this department</button>}
    <ChatDock area="bots" departmentId={department.id} />
  </>;
}

function BotDesk({ departmentId, state, reload }: { departmentId: string; state: Access; reload: () => Promise<void> }) {
  const map = state.workflowMaps?.[departmentId];
  const saved = (state.automations || []).filter((item) => item.departmentId === departmentId);
  const partners = state.departments.filter((item) => item.id !== departmentId);
  return <>
    {map?.flows?.[0] && <section className="card pad"><div className="ch"><h2>Workflow map</h2>{map && <span className="sample-badge">SAMPLE DATA</span>}</div><div className="flow">{map.flows[0].steps.map((step, index) => <span key={step}>{step}<small>{map.flows[0].weeklyHours ? ` · ${Math.round(map.flows[0].weeklyHours / Math.max(1, map.flows[0].steps.length) * 10) / 10} h/week` : ""}</small></span>)}</div>{map.friction?.length > 0 && <div className="ch"><h2>Bottlenecks</h2></div>}{map.friction?.map((item) => <p key={item}>{item}</p>)}</section>}
    {map?.proposals?.length ? <section className="card pad"><div className="ch"><h2>Proposed automations</h2><span className="sample-badge">SAMPLE DATA</span></div>{map.proposals.map((item) => <article className="fix" key={item.id}><h3>{item.name}</h3><p>{item.trigger}</p><p className="note">{item.formula}. {item.assumption}. {item.hoursSavedPerMonth} hours / month. {item.impactAed == null ? item.aedFormula : `AED ${item.impactAed.toLocaleString("en-AE")}. ${item.aedFormula}`}</p><p>{item.revenueAngle}</p>{state.role === "dev" && <button type="button" className="btn sm" onClick={async () => { await api("/api/brain/automation", item); await reload(); }}>Build automation</button>}</article>)}</section> : <p className="note">Ingest the demo sources to load this department’s workflow file.</p>}
    {saved.length > 0 && <section className="card pad"><div className="ch"><h2>Automations</h2><span className="sample-badge">SAMPLE DATA</span></div>{saved.map((item) => <div className="plainrow" key={item.id}><span /><span><b>{item.name}</b><small>{item.impactAed ? `AED ${item.impactAed.toLocaleString("en-AE")}. ` : ""}{item.runs.map((run) => run.note).join(" ") || "No runs yet."}</small></span><span><button type="button" className="btn sm ghost" onClick={async () => { await api("/api/brain/automation/toggle", { id: item.id }); await reload(); }}>{item.enabled ? "On" : "Off"}</button> <button type="button" className="btn sm" onClick={async () => { await api("/api/brain/automation/run", { id: item.id }); await reload(); }}>Simulated run</button></span></div>)}</section>}
    <section className="card pad"><div className="ch"><h2>Partner departments</h2></div>{partners.map((item) => <div className="plainrow" key={item.id}><span /><span><b>{item.name}</b><small>{item.confirmed ? "Confirmed" : "Not confirmed"}</small></span><span className={item.confirmed ? "state-chip done" : "state-chip wait"}>{item.confirmed ? "Live" : "Waiting"}</span></div>)}</section>
  </>;
}

function ChatDock({ area = "brain", departmentId, onResult }: { area?: string; departmentId?: string; onResult?: (result: { chart?: NonNullable<Access["pins"]>[number]; fixes?: Access["opportunities"]; steps?: { tool: string; detail: string }[]; answer?: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<{ who: string; text: string; cite?: string }[]>([{ who: "BusinessBrain", text: "Ask about a document you indexed. I cite the passage or I say there is no match.", cite: "Prototype retrieval · no base model" }]);
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    const question = text.trim();
    if (!question) return;
    setText("");
    setOpen(true);
    setLines((prev) => [...prev, { who: "You", text: question }]);
    try {
      const result = await api("/api/brain/ask", { question, area, departmentId });
      onResult?.(result);
      const trace = result.steps?.map((step: { tool: string; detail: string }) => `${step.tool}: ${step.detail}`).join(" ");
      setLines((prev) => [...prev, { who: "BusinessBrain", text: result.answer, cite: result.citations?.[0] ? `${result.citations[0].document}: ${result.citations[0].excerpt}` : trace }]);
    } catch (reason) { setLines((prev) => [...prev, { who: "BusinessBrain", text: (reason as Error).message }]); }
  }
  return <>
    {open && <section className="card pad" aria-label="BusinessBrain transcript"><div className="log">{lines.map((line, index) => <div className="chatline" key={index}><b>{line.who}</b><div>{line.text}</div>{line.cite && <small>{line.cite}</small>}</div>)}</div></section>}
    <section className="chatdock" aria-label="BusinessBrain chat"><form className="ask" onSubmit={ask}><button type="button" className="btn ghost sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Hide chat" : "Show chat"}</button><input aria-label="Question" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask BusinessBrain" /><button className="btn" type="submit">Ask</button></form></section>
  </>;
}
