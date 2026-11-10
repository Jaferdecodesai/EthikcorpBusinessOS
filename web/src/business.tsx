import React, { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import { SOURCES } from "../phase1/customer-logic.mjs";
import { ceoDashboard } from "../server/ceo-dashboard.mjs";
import { BarList } from "./charts";

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
};

const dash = ceoDashboard();

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
      <a className="brand" href="#pm"><span className="mark">EC</span><span><b>Ethikcorp BusinessOS</b><small>Built by Aqionlabs.ai</small></span></a>
      <nav aria-label="Product">{(state?.tabs || [{ id: "pm", label: "BusinessBrain Builder", enabled: true }, { id: "brain", label: "Ethikcorp BusinessBrain", enabled: false }, { id: "bots", label: "Ethikcorp Businessbots", enabled: false }]).map((item) => item.enabled ? <a key={item.id} className={tab === item.id ? "nav on" : "nav"} href={`#${item.id}`}>{item.label}</a> : <button key={item.id} type="button" className="nav" disabled title="This opens when the build reaches it">{item.label}</button>)}</nav>
      <div className="sidefoot">{state?.role === "dev" ? "Development team. All three areas are open." : "Customer view. Locked areas open from live build progress."}</div>
    </aside>
    <div className="maincol">
      <header className="topbar">
        <div className="ctx"><span>Ethikcorp BusinessOS</span><span aria-hidden="true">/</span><b>{tab === "brain" ? "BusinessBrain" : tab === "bots" ? "Businessbots" : "BusinessBrain Builder"}</b></div>
        <div className="pills"><span className="pill a"><i />Prototype · not UAE-hosted</span><span className="pill r"><i />No base model connected</span></div>
      </header>
      <div className="page live-pad">
        {error && <div className="banner-need" role="alert">{error}</div>}
        {!allowed && <Locked percent={state?.percent || 0} what={tab} />}
        {allowed && tab === "pm" && state && <Project state={state} reload={reload} />}
        {allowed && tab === "brain" && state && <Brain state={state} />}
        {allowed && tab === "bots" && state && <Bots hash={hash} state={state} reload={reload} />}
      </div>
    </div>
  </div>;
}

function Locked({ percent, what }: { percent: number; what: string }) {
  return <section className="card pad"><div className="eyebrow">Still building</div><h1>{what === "bots" ? "Businessbots is waiting for department confirmation" : "BusinessBrain is being built"}</h1><p className="v" style={{ font: "600 42px/1 var(--f)", color: "var(--ink)" }}>{percent}%</p><div className="meter" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div><p className="note">This percentage counts finished pipeline stages. It is not a forecast.</p></section>;
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
    <div className="vh"><div><div className="eyebrow">BusinessBrain Builder</div><h1>Build the company brain</h1><p className="sub">Progress is {state.percent}%. {state.documents.length} documents, {state.chunks} passages.</p></div><button type="button" className="btn" onClick={speak}>Speak status</button></div>
    {notice && <p className="note" role="status">{notice}</p>}
    <Outline state={state} />
    <Ownership reload={reload} />
    <Handoff reload={reload} />
    <section className="card pad"><div className="ch"><h2>Where this prototype runs</h2></div><p>{state.residency.prototype}</p><p className="note">{state.residency.embedding} {state.residency.llm}</p><p className="note">{state.residency.production}</p></section>
    {state.role === "dev" && <DevTools state={state} reload={reload} />}
  </>;
}

function Outline({ state }: { state: Access }) {
  return <section className="card pad" aria-label="Pipeline"><div className="ch"><h2>Pipeline</h2></div>
    {Object.entries(state.stages).map(([id, stage]) => <div className="plainrow" key={id}><span className="num">{stage.status === "done" ? "✓" : "·"}</span><span><b>{id}</b><small>{stage.detail}</small></span><span className="note">{stage.status === "done" ? "Done" : "Not started"}</span></div>)}
    <div className="plainrow"><span /><span><b>Fine-tune</b><small>{state.finetune.detail}</small></span><span className="note">Not runnable here</span></div>
  </section>;
}

function Ownership({ reload }: { reload: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  return <section className="card pad"><div className="ch"><h2>1. Source ownership</h2></div><p className="note">Upload the completed .xlsx. All 18 sources must be present. Row errors stay on screen and nothing is stored until the file is valid.</p>
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
  </section>;
}

function Handoff({ reload }: { reload: () => Promise<void> }) {
  const [name, setName] = useState("services.md");
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  return <section className="card pad"><div className="ch"><h2>2. Document handoff</h2></div><p className="note">UTF-8 text or Markdown is parsed, cleaned, chunked, embedded, and indexed immediately. PDF and Office files are refused until a parser is connected.</p>
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
  </section>;
}

function DevTools({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [link, setLink] = useState("");
  return <section className="card pad"><div className="ch"><h2>Development pipeline</h2></div>
    <p>Collection, cleaning, parsing, chunking, embedding, vectors, RAG, evaluation, and connectors are the stages above. Fine-tuning is listed and is not running.</p>
    <p className="note">GitHub: {state.connectors.github.ok ? "token present" : `missing ${state.connectors.github.missing?.join(", ")}`}. Drive: {state.connectors.drive.ok ? "OAuth present" : `missing ${state.connectors.drive.missing?.join(", ")}`}. No files are fetched from either until those credentials exist.</p>
    <button type="button" className="btn ghost" onClick={async () => { const result = await api("/api/brain/bootstrap-dev", {}); setLink(result.url || result.error || ""); }}>Issue the development invite</button>
    {link && <p className="note">Give this URL only to the development team. It is signed with the existing session secret.</p>}
    {link && <p><a href={link}>{link}</a></p>}
    <div className="ch"><h2>Confirm departments</h2></div>
    {state.departments.map((department) => <div className="plainrow" key={department.id}><span /><span><b>{department.name}</b><small>{department.workflows.join(", ")}</small></span><button type="button" className="btn sm" disabled={department.confirmed} onClick={async () => { await api("/api/brain/confirm", { id: department.id }); await reload(); }}>{department.confirmed ? "Confirmed" : "Confirm"}</button></div>)}
  </section>;
}

function Brain({ state }: { state: Access }) {
  return <>
    <div className="vh"><div><div className="eyebrow">Ethikcorp BusinessBrain</div><h1>Ask from indexed documents</h1><p className="sub">{dash.label}</p></div></div>
    <div className="grid g4"><article className="card kpi pad"><div className="l">Indexed documents</div><div className="v">{state.documents.length}</div></article><article className="card kpi pad"><div className="l">Passages</div><div className="v">{state.chunks}</div></article><article className="card kpi pad"><div className="l">Demo tasks</div><div className="v">{dash.company.tasksDone}/{dash.company.tasksOpen}</div><div className="x">Sample snapshot</div></article><article className="card kpi pad"><div className="l">Model</div><div className="v" style={{ fontSize: 18 }}>Not connected</div></article></div>
    <section className="card pad" style={{ marginTop: 16 }}><BarList caption="Sample net hours per week from the setup model. Not measured." rows={dash.hourBars.map((row) => ({ ...row, note: "estimate" }))} /></section>
    <ChatDock />
  </>;
}

function Bots({ hash, state, reload }: { hash: string; state: Access; reload: () => Promise<void> }) {
  const selected = hash.split("/")[1];
  const department = catalog.find((item) => item.id === selected);
  if (!department) return <div className="grid g3">{catalog.map((item) => <a className="card pad" key={item.id} href={`#bots/${item.id}`} style={{ textDecoration: "none" }}><div className="l">{item.code}</div><h2 style={{ fontSize: 18 }}>{item.name}</h2><p className="note">{item.mandate}</p></a>)}</div>;
  return <>
    <div className="vh"><div><div className="eyebrow">{department.code}</div><h1>{department.name}</h1><p className="sub">{department.mandate}</p></div><a className="btn ghost" href="#bots">All departments</a></div>
    <section className="card pad"><div className="ch"><h2>Workflows</h2><span className="note">{state.departments.find((item) => item.id === department.id)?.confirmed ? "Confirmed by the development team" : "Not confirmed"}</span></div>
      {department.workflows.map((workflow) => <div className="plainrow" key={workflow.id}><span /><span><b>{workflow.name}</b><small>{workflow.description}</small></span><span className="note">Template · not running</span></div>)}
    </section>
    {state.role === "dev" && <button type="button" className="btn" onClick={async () => { await api("/api/brain/confirm", { id: department.id }); await reload(); }}>Confirm this department</button>}
    <ChatDock />
  </>;
}

function ChatDock() {
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
      const result = await api("/api/brain/ask", { question });
      setLines((prev) => [...prev, { who: "BusinessBrain", text: result.answer, cite: result.citations?.[0] ? `${result.citations[0].document}: ${result.citations[0].excerpt}` : result.note }]);
    } catch (reason) { setLines((prev) => [...prev, { who: "BusinessBrain", text: (reason as Error).message }]); }
  }
  return <section className="chatdock" aria-label="BusinessBrain chat">
    {open && <div className="log">{lines.map((line, index) => <div className="chatline" key={index}><b>{line.who}</b><div>{line.text}</div>{line.cite && <small>{line.cite}</small>}</div>)}</div>}
    <form className="ask" onSubmit={ask}><button type="button" className="btn ghost sm" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Hide chat" : "Show chat"}</button><input aria-label="Question" value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask BusinessBrain" /><button className="btn" type="submit">Ask</button></form>
  </section>;
}
