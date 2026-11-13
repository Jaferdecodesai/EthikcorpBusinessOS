import React, { useEffect, useState } from "react";
import catalog from "../shared/departments.json";
import { SOURCES } from "../phase1/customer-logic.mjs";
import { BUILD_STAGES } from "../shared/brain-stages.mjs";
import { KpiTile, LiveChart, type ChartSpec, type KpiModel } from "./charts";
import { buildOverview } from "../server/datasets.mjs";
import { formatCompact, formatFull } from "./format";
import { DepartmentSupervision } from "./department-supervision";
import { BUSINESS_TABLES } from "../server/business-intake.mjs";

type Destination = { status: string; detail?: string; url?: string };
type HandoffReceipt = { id: string; stage: string; name: string; indexed: boolean; withdrawnAt?: string; restoring?: boolean; pages?: number; textPages?: number; destinations: Record<"github" | "drive", Destination> };
type SourceInventory = {
  sources: { id: string; name: string; sourceId: string; audience: string; revisions: number; serving: boolean; current: boolean; eligible: boolean }[];
  withdrawals: { name: string; sourceId: string; reason: string; actor: string; at: string; revisions: number }[];
};
type Access = {
  role: "customer" | "dev";
  portalMode?: "production" | "customer" | "aqionteam";
  ownershipReady?: boolean;
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
  instruction?: { exported: boolean; pairs: number; validated: boolean; lora: string };
  indexLayer?: { retrieval?: string; semantic?: string };
  demo?: { github: string; driveUrl: string; sha?: string; needsReingest?: boolean; drive: { status: string; detail: string } | null; filesTotal: number; filesDone: number; log: { path: string; sample?: boolean }[] };
  quality?: { sha: string; fetchedAt: string; files: Record<string, { path: string; source: string; status?: string; reason?: string; driveId?: string; rows: number; passages?: number; pass: boolean; schema?: { name: string; type: string }[] }>; cross?: { pass: boolean; checks: { name: string; pass: boolean; detail: string }[] } };
  datasets?: { id: string; rows: number; source?: string; url?: string; handoffId?: string }[];
  workspaceId?: string;
  businessMode?: "uploaded" | "demo";
  model?: { ready: boolean; updated?: string; grossOpen?: number; revenue: { month: string; label: string; line: string; value: number }[]; hours: { department: string; headcount?: number; hours: number; available: number; billable: number }[]; clients?: { name: string; line: string; status: string; revenue: number }[]; openDeals?: { client: string; stage: string; value: number; prob: number; weighted: number; department: string; owner: string }[]; stages: { name: string; value: number }[]; risk: { name: string; value: number }[]; winRate: number | null; winRateValue: number | null; weighted: number; targets: { metric: string; subject: string; value: number; unit: string; goodDirection: string }[] };
  opportunities?: { id: string; title: string; impactAed: number; formula: string; confidence: string; owner: string }[];
  pins?: { id: string; type: string; title: string; sample?: boolean; unit?: string; categories?: string[]; series: { name: string; value?: number; values?: number[] }[] }[];
  tasks?: { id: string; title: string; department: string; impactAed: number }[];
  automations?: { id: string; departmentId: string; name: string; enabled: boolean; impactAed?: number | null; runs: { at: string; note: string }[] }[];
  workflowMaps?: Record<string, { flows: { title: string; weeklyHours: number; steps: string[] }[]; friction: string[]; proposals: { id: string; name: string; trigger: string; steps: string[]; chain?: string; tools?: string[]; schedule: string; hoursSavedPerMonth: number; formula: string; impactAed: number | null; aedFormula: string; revenueAngle: string; assumption: string }[] }>;
  llm?: { provider: string; model: string | null; region: string; embedding: string; azure: { missing: string[] } };
  handoff?: { connectors: Record<"github" | "drive", { ready: boolean; missing: string[]; destination: string }>; receipts: HandoffReceipt[] };
  sourceInventory?: SourceInventory;
  workspace?: { mode: "local" | "team"; role: "dev" | "ceo" | "head"; department?: string };
  releaseModel?: { mode: "azure" | "extractive"; approved: boolean; deployment: string | null; missing: string[]; invalid: boolean };
  release?: { candidates: number; canDeploy: boolean; needsGolden?: boolean; pendingChanges: boolean; evaluation: { passed: boolean; checks: { name: string; citation: boolean; excluded: boolean }[]; profile?: string; validationChecks?: { expectedDocument: string | null; department: string | null; match: string | null; passed: boolean }[] } | null; active: { id: string; deployedAt: string; documents: number; departments: string[]; contentVersion?: string } | null };
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

function normalizeHash(value: string) {
  const hash = value || "#pm";
  if (hash === "#builder" || hash.startsWith("#builder/") || hash.startsWith("#builder?")) return hash.replace("#builder", "#pm");
  return hash;
}

export function BusinessApp() {
  const [hash, setHash] = useState(normalizeHash(window.location.hash || "#pm"));
  const [state, setState] = useState<Access | null>(null);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const stateRequest = React.useRef(0);
  const [ceoView, setCeoView] = useState(true);
  const [chatOpen, setChatOpen] = useState(() => {
    const stored = localStorage.getItem("bos-chat");
    if (stored === "open") return true;
    return false;
  });
  function toggleChat() {
    setChatOpen((value) => {
      localStorage.setItem("bos-chat", value ? "rail" : "open");
      return !value;
    });
  }
  async function reload() {
    const request = ++stateRequest.current;
    try {
      const next = await api("/api/brain/state");
      if (request === stateRequest.current) { setState(next); setError(""); }
    } catch (reason) {
      if (request === stateRequest.current) setError((reason as Error).message);
    }
  }
  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0 });
  }, [hash]);
  useEffect(() => {
    const dock = document.querySelector<HTMLElement>(".chat-dock");
    if (!dock) return;
    const apply = () => document.documentElement.style.setProperty("--dock-h", `${Math.ceil(dock.getBoundingClientRect().height)}px`);
    const observer = new ResizeObserver(apply);
    observer.observe(dock);
    apply();
    return () => observer.disconnect();
  }, [chatOpen, hash]);
  useEffect(() => {
    const invite = new URLSearchParams(window.location.search).get("invite");
    const start = invite ? api("/api/brain/claim", { invite }).catch(() => undefined).then(() => { history.replaceState(null, "", "/#pm"); setHash("#pm"); return reload(); }) : reload();
    void start;
    const timer = window.setInterval(reload, 4000);
    const onHash = () => {
      const next = normalizeHash(window.location.hash || "#pm");
      if (next !== (window.location.hash || "#pm")) history.replaceState(null, "", `/${next}`);
      setHash(next);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => { window.clearInterval(timer); window.removeEventListener("hashchange", onHash); };
  }, []);
  const team = state?.workspace?.mode === "team";
  const assigned = state?.workspace?.department;
  const home = assigned ? `#bots/${assigned}` : team && state.workspace?.role === "ceo" ? "#brain" : "#pm";
  const route = assigned ? `#bots/${assigned}${hash === `#bots/${assigned}/process` ? "/process" : ""}` : hash === "#pm" ? home : hash;
  const raw = route.replace("#", "") || "pm";
  const tab = raw.startsWith("bots/") ? "bots" : (raw === "dev" || raw === "customer" || raw === "builder" ? "pm" : raw);
  const current = state?.tabs.find((item) => item.id === tab);
  const customerPortal = state?.portalMode === "customer";
  const allowed = customerPortal || team ? Boolean(current?.enabled) : (!current || current.enabled);
  const departmentId = raw.startsWith("bots/") ? raw.split("/")[1] : undefined;
  const businessChat = tab === "brain" && state?.businessMode === "uploaded";
  const showChat = (tab !== "bots" || Boolean(departmentId)) && (!team || Boolean(allowed && (businessChat || (state.release?.active && (tab === "brain" || (tab === "bots" && departmentId && state.release.active.departments.includes(departmentId)))))));
  const pageName = tab === "brain" ? "Business overview" : tab === "bots" ? "Businessbots" : "BusinessBrain PM";
  return <div className={`portal ${chatOpen ? "chat-open" : "chat-collapsed"} ${navOpen ? "nav-open" : ""} ${departmentId ? "department-page" : ""}`}>
    {navOpen && <button type="button" className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <aside className="side" aria-label="Ethikcorp BusinessOS">
      <div className="side-stick">
      <a className="brand" href={home}><span className="mark">EC</span><span><b>Ethikcorp BusinessOS</b><small>Built by Aqionlabs.ai</small></span></a>
      <nav aria-label="Product">{(state?.tabs || [{ id: "pm", label: "BusinessBrain PM", enabled: true }, { id: "brain", label: "Ethikcorp BusinessBrain", enabled: false }, { id: "bots", label: "Ethikcorp Businessbots", enabled: false }]).map((item) => <a key={item.id} className={item.enabled ? (tab === item.id ? "nav on" : "nav") : "nav dim"} aria-current={tab === item.id ? "page" : undefined} href={`#${item.id}`} title={item.enabled ? undefined : customerPortal && !state?.ownershipReady ? "Opens after Step 1, Source ownership" : "This opens when the build reaches it"} onClick={() => setNavOpen(false)}><span className="nav-symbol"><StageIcon id={item.id === "pm" ? "chunk" : item.id === "brain" ? "index" : "embed"} /></span>{item.label}</a>)}</nav>
      <div className="sidefoot">{team ? "Ethikcorp team workspace" : state?.handoff ? "Local development workspace" : state?.role === "dev" && !ceoView ? "Development view" : "Customer preview"}</div>
      </div>
    </aside>
    <div className="maincol">
      <header className="topbar">
        <button type="button" className="nav-toggle" aria-label={navOpen ? "Close navigation" : "Open navigation"} onClick={() => setNavOpen((value) => !value)}>Menu</button>
        <div className="ctx"><span>Ethikcorp BusinessOS</span><span aria-hidden="true">/</span><b>{pageName}</b></div>
        <div className="pills">
          <details className="env-pop">
            <summary className="badge neutral">{team ? "Team workspace" : state?.handoff ? "Local workspace" : "Prototype"}</summary>
            <div className="pop"><p>{team ? "Access is set by your Ethikcorp account." : state?.handoff ? "Build state is stored on this machine." : state?.residency.prototype || "Prototype workspace"}</p><p>{state?.releaseModel?.mode === "azure" ? "Azure OpenAI configured for cited answers" : state?.llm?.provider === "workers-ai" ? state.llm.model : "Extractive retrieval"}</p></div>
          </details>
          {state?.role === "dev" && !team && <button type="button" className="btn ghost sm ceo-toggle" onClick={() => setCeoView((value) => !value)}>{ceoView ? "CEO view" : "Development view"}</button>}
          <span className="user-menu">{assigned ? "Department head" : state?.role === "dev" && (team || !ceoView) ? "Development" : "CEO"}</span>
        </div>
      </header>
      <div className="page live-pad" ref={pageRef}>
        {!state && <DashboardSkeleton />}
        {error && <div className="banner-need" role="alert">{error}</div>}
        {!allowed && <Locked percent={state?.percent || 0} what={tab} departments={state?.departments || []} portalMode={state?.portalMode} step1={Boolean(state?.ownershipReady)} />}
        {allowed && tab === "pm" && state && <Project state={state} reload={reload} />}
        {allowed && tab === "brain" && state && <Brain key={state.workspaceId} state={state} reload={reload} />}
        {allowed && tab === "bots" && state && <Bots key={state.workspaceId} hash={route} state={state} reload={reload} canValidate={state.workspace?.role === "ceo" || (state.workspace?.mode === "local" && ceoView)} />}
      </div>
      {showChat && <ChatDock key={`${state?.workspaceId || ""}:${tab}:${departmentId || ""}:${state?.release?.active?.id || ""}:${state?.release?.active?.contentVersion || ""}:${businessChat ? state?.datasets?.map((table) => table.handoffId).join(",") : ""}`} release={Boolean(state?.release?.active || businessChat)} uploadedAnalytics={businessChat} open={chatOpen} onToggle={toggleChat} role={state?.role === "dev" && (team || !ceoView) ? "dev" : "customer"} area={tab === "bots" ? "bots" : "brain"} departmentId={departmentId} placeholder={businessChat ? "Ask about total revenue, weighted pipeline, or utilisation" : state?.release?.active ? "Ask about approved company sources" : tab === "pm" ? "Ask about build status…" : tab === "bots" ? "Ask the department bot…" : "Ask about revenue, pipeline or utilisation"} onResult={(result) => window.dispatchEvent(new CustomEvent("bos-insight", { detail: result }))} />}
    </div>
  </div>;
}

function Locked({ percent, what, departments, portalMode, step1 }: { percent: number; what: string; departments: { confirmed: boolean }[]; portalMode?: string; step1?: boolean }) {
  const bots = what === "bots";
  const waiting = portalMode === "customer" && !step1;
  const confirmed = departments.filter((department) => department.confirmed).length;
  const shown = waiting ? 0 : bots ? Math.round((confirmed / Math.max(1, departments.length || 9)) * 100) : percent;
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
      <h1>{waiting ? "BusinessBrain and Businessbots open after Step 1" : bots ? "Your department Businessbots are being built" : "BusinessBrain is being built"}</h1>
      <Ring percent={shown} />
      <div className="meter" role="progressbar" aria-valuenow={shown} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${shown}%` }} /></div>
      <p className="note">{waiting ? "Import and validate the ownership workbook in BusinessBrain PM. All 18 sources must be present. These tabs stay locked until that file is valid." : bots ? `${confirmed} of 9 departments confirmed. This percentage counts confirmed departments. It is not a forecast.` : "This percentage counts finished pipeline stages. It is not a forecast."}</p>
    </section>
  </div>;
}

function Project({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState("ownership");
  const active = BUILD_STAGES.find((stage) => stage.id === selected)!;
  const current = describeStage(state, active.id);
  function speak() {
    const text = `BusinessBrain PM progress is ${state.percent} percent. ${state.documents.length} documents are indexed.`;
    if (!("speechSynthesis" in window)) { setNotice("This browser has no speech engine. The status is on screen."); return; }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    setNotice("Speaking with this browser’s voice. No external speech service is used.");
  }
  return <>
    <section className="hero-build">
      <div className="hero-copy">
        <div className="eyebrow">BusinessBrain PM</div>
        <h1>Build the company brain</h1>
        <p className="sub">Review source ownership, build the retrieval index, and prepare department bots.</p>
        <div className="kpi-row builder-kpis"><article className="kpi-tile"><span className="kpi-label">Documents indexed</span><span className="kpi-value">{state.documents.length}</span></article><article className="kpi-tile"><span className="kpi-label">Passages</span><span className="kpi-value">{state.chunks}</span></article><article className="kpi-tile"><span className="kpi-label">Demo files checked</span><span className="kpi-value">{state.demo?.filesDone || 0}</span></article></div>
        <button type="button" className="btn" onClick={speak}>Speak status</button>
      </div>
      <div className="hero-ring">
        <Ring percent={state.percent} />
        <p>{state.demo?.filesDone ? "Core pipeline · includes demo sources" : "Core retrieval pipeline"}</p>
      </div>
    </section>
    {notice && <p className="note" role="status">{notice}</p>}
    {state.release && <ReleasePanel release={state.release} model={state.releaseModel} shared={state.workspace?.mode === "team"} reload={reload} />}
    <div className="build-workspace">
      <Outline state={state} selected={selected} onSelect={setSelected} />
      <section className="card stage-detail" aria-labelledby="selected-stage-title">
        <header><div className="pipe-top"><StageIcon id={active.id} /><h2 id="selected-stage-title">{active.title}</h2></div>
          <span className={`badge ${current.status === "done" ? "success" : "neutral"}`}>{stageLabel(current.status)}</span>
          <p>{current.detail}</p>
        </header>
        {selected === "ownership" && <Ownership state={state} reload={reload} />}
        {selected === "intake" && !state.handoff && state.portalMode !== "customer" && <Handoff reload={reload} />}
        {selected === "refresh" && state.sourceInventory && <SourceLifecycle inventory={state.sourceInventory} reload={reload} openIntake={() => setSelected("intake")} />}
        {state.handoff && <StageHandoff key={selected} stage={active} handoff={state.handoff} reload={reload} />}
        {selected === "intake" && state.handoff && <BusinessFiles tables={state.datasets || []} reload={reload} />}
        {selected === "refresh" && state.handoff && <ResetControl mode="uploads" workspaceId={state.workspaceId || ""} reload={reload} />}
        {selected === "intake" && state.portalMode !== "customer" && state.businessMode !== "uploaded" && <DemoSources state={state} reload={reload} />}
        {selected === "evaluation" && state.quality && <div className="pad"><DataQuality quality={state.quality} /></div>}
      </section>
    </div>
    <section className="card band-card lift"><div className="card-band">Workspace runtime</div><div className="pad"><p>{state.workspace?.mode === "team" ? "Team workspace · data and release state are stored on the configured server." : state.handoff ? "Local development workspace · data and release state are stored on this machine." : state.residency.prototype}</p><p className="note">{state.handoff ? "Retrieval uses hashed vectors, keyword matching and source citations." : `${state.residency.embedding} ${state.residency.llm}`}</p></div></section>
    {state.role === "dev" && <DevTools state={state} reload={reload} />}
    {state.handoff && <ResetControl mode="business" workspaceId={state.workspaceId || ""} reload={reload} />}
  </>;
}

function describeStage(state: Access, id: string) {
  if (id === "refresh" && state.sourceInventory && (state.sourceInventory.sources.length || state.sourceInventory.withdrawals.length)) {
    return { status: "available", detail: `${state.sourceInventory.sources.length} indexed sources · ${state.sourceInventory.withdrawals.length} recorded withdrawals.` };
  }
  if (id === "parse" && state.handoff) return { status: state.stages.parse.status, detail: "Extract text from Markdown, text files, text-based PDFs, and Word documents." };
  if (id === "rag" && state.handoff && state.stages.rag.status === "done") return { status: "done", detail: `${state.chunks} indexed passages. ${state.releaseModel?.mode === "azure" ? "Cited answer model configured." : "Answers cite retrieved passages."}` };
  if (id === "index" && state.handoff) return { status: state.stages.index.status, detail: `${state.chunks} passages in the local index.` };
  if (state.stages[id]) return state.stages[id];
  if (id === "semantic") return { status: state.indexLayer?.semantic === "built" ? "done" : "not_started", detail: "Service-line aliases, KPI definitions and sample targets." };
  if (id === "instruction") return { status: state.instruction?.validated ? "done" : "not_started", detail: state.instruction?.validated ? `${state.instruction.pairs} validated sample pairs.` : "Prepare anonymised examples for style and response format." };
  if (id === "finetune") return { status: "held", detail: state.finetune.detail };
  if (id === "evaluation") return { status: state.release ? (state.release.evaluation?.passed ? "done" : "not_started") : (state.quality?.cross?.pass ? "done" : "not_started"), detail: "Check source citations and department visibility for the release candidate." };
  const detail = {
    privacy: "Record redactions, sensitive material and excluded sources.",
    access: "Record which roles and departments may retrieve each source.",
    refresh: "Review indexed sources, replace outdated files, or withdraw a source from BusinessBrain and department bots."
  }[id];
  const archived = state.handoff?.receipts.some((file) => file.stage === id && Object.values(file.destinations).every((target) => target.status === "uploaded"));
  return { status: archived ? "archived" : "not_started", detail };
}

function ReleasePanel({ release, model, reload, shared }: { release: NonNullable<Access["release"]>; model?: Access["releaseModel"]; reload: () => Promise<void>; shared: boolean }) {
  const [working, setWorking] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  async function run(action: "evaluate" | "deploy") {
    setWorking(action); setFeedback(""); setError("");
    try {
      const result: NonNullable<Access["release"]> = await api(`/api/brain/${action}`, {});
      setFeedback(action === "deploy" ? "BusinessBrain and confirmed department bots are active in this workspace." : result.evaluation?.passed ? "Retrieval checks passed." : "Review the failed checks before deploying.");
      await reload();
    } catch (reason) { setError((reason as Error).message); }
    finally { setWorking(""); }
  }
  return <section className="card pad release-panel" aria-label="BusinessBrain release">
    <div className="ch"><h2>BusinessBrain release</h2><span className={`badge ${release.active ? "success" : "neutral"}`}>{release.active ? (shared ? "Active for team" : "Active locally") : "Awaiting deployment"}</span></div>
    <p>{release.candidates} approved {release.candidates === 1 ? "document" : "documents"} in the release candidate.</p>
    {model && <p className="note">{model.mode === "azure" ? `Cited answer model · ${model.deployment}` : model.invalid ? "Extractive retrieval · check the configured Azure endpoint and deployment." : model.approved && model.missing.length ? `Extractive retrieval · missing ${model.missing.join(", ")}` : "Cited passages · extractive mode"}</p>}
    {release.needsGolden && <p className="note">Upload validation questions as JSONL in the Evaluation stage before deploying to the team.</p>}
    {release.active && <p className="note">{release.active.documents} released sources · {release.active.departments.length} active department bots · {updatedLabel(release.active.deployedAt)}{release.pendingChanges ? " · Pending source changes" : ""}</p>}
    <div className="controls">
      <button className="btn ghost" type="button" disabled={!release.candidates || Boolean(working)} onClick={() => run("evaluate")}>{working === "evaluate" ? "Checking…" : "Run retrieval checks"}</button>
      <button className="btn" type="button" disabled={!release.canDeploy || Boolean(working)} onClick={() => run("deploy")}>{working === "deploy" ? "Deploying…" : "Deploy BusinessBrain"}</button>
    </div>
    {release.evaluation && <details><summary>{release.evaluation.checks.length} source checks</summary><ul>{release.evaluation.checks.map((check, index) => <li key={index}>{check.name} · {check.citation ? "Citation verified" : "Citation failed"} · {check.excluded ? "Visibility verified" : "Visibility failed"}</li>)}</ul></details>}
    {Boolean(release.evaluation?.validationChecks?.length) && <details><summary>{release.evaluation?.validationChecks?.filter(({ passed }) => passed).length} of {release.evaluation?.validationChecks?.length} validation questions passed</summary>
      <p className="note">Ranking profile {release.evaluation?.profile}</p>
      <ul>{release.evaluation?.validationChecks?.map((check, index) => <li key={index}>Case {index + 1} · {check.passed ? "Passed" : "Failed"} · Expected {check.expectedDocument || "no matching passage"} · Returned {check.match || "no matching passage"}</li>)}</ul>
    </details>}
    {feedback && <p role="status">{feedback}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

function stageLabel(status: string) {
  return { done: "Complete", archived: "Evidence archived", available: "Sources available", running: "Running", held: "External runtime", blocked: "Blocked" }[status] || "Not started";
}

function Outline({ state, selected, onSelect }: { state: Access; selected: string; onSelect: (id: string) => void }) {
  return <nav className="card stage-nav" aria-label="Build pipeline">
    <h2>Build pipeline</h2>
    {BUILD_STAGES.map(({ id, title }) => {
      const stage = describeStage(state, id);
      const count = state.handoff?.receipts.filter((file) => file.stage === id).length || 0;
      return <button type="button" className={`stage-select ${stageClass(id, stage.status)}`} aria-pressed={selected === id} key={id} onClick={() => onSelect(id)}>
        <span className="stage-mark"><StageIcon id={id} /></span>
        <span><strong>{title}</strong><small>{stageLabel(stage.status)}{count > 0 ? ` · ${count} ${count === 1 ? "file" : "files"}` : ""}</small></span>
        <span className="stage-chevron" aria-hidden="true">›</span>
      </button>;
    })}
  </nav>;
}

function StageHandoff({ stage, handoff, reload }: { stage: (typeof BUILD_STAGES)[number]; handoff: NonNullable<Access["handoff"]>; reload: () => Promise<void> }) {
  const [intakeType, setIntakeType] = useState("document");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checks, setChecks] = useState<Partial<Record<"github" | "drive", Destination>>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const targets = [["github", "GitHub"], ["drive", "Google Drive"]] as const;
  const sources = SOURCES.filter(({ id }: { id: string }) => ["profile", "policies", "sops", "tasks", "marketing"].includes(id));
  const receipts = handoff.receipts.filter((file) => file.stage === stage.id).slice().reverse();
  const ready = targets.some(([id]) => handoff.connectors[id].ready);
  const accept = stage.id === "ownership" ? ".xlsx" : stage.id === "intake" ? (intakeType === "document" ? ".md,.txt,.pdf,.docx" : ".csv") : ".md,.txt,.pdf,.docx,.xlsx,.csv,.json,.jsonl";
  async function verify() {
    setError(""); setChecking(true);
    try { setChecks(await api("/api/brain/verify-destinations", {})); }
    catch (reason) { setError((reason as Error).message); }
    finally { setChecking(false); }
  }
  return <div className="pad stage-handoff">
    <h3>Upload stage files</h3>
    <p className="note">{stage.evidence}. Up to 5 MB per file.</p>
    {stage.id === "evaluation" && <p className="note">A JSONL question suite uses question, expectedDocument (a file name or null), optional department ID, and split (calibration or validation).</p>}
    <ul className="handoff-targets" aria-live="polite">
      {targets.map(([id, label]) => <li key={id}>
        <strong>{label}</strong><span className={`badge ${checks[id]?.status === "verified" ? "success" : checks[id]?.status === "failed" ? "low" : "neutral"}`}>{checks[id]?.status === "verified" ? "Access checked" : checks[id]?.status === "failed" ? "Check failed" : handoff.connectors[id].ready ? "Configured" : "Setup needed"}</span>
        <small>{handoff.connectors[id].ready ? handoff.connectors[id].destination : handoff.connectors[id].missing.join(", ")}</small>
        {checks[id]?.detail && handoff.connectors[id].ready && <small>{checks[id]?.detail}</small>}
      </li>)}
    </ul>
    {ready && <p><button className="btn ghost sm" type="button" disabled={checking || busy} onClick={verify}>{checking ? "Checking access…" : "Verify destination access"}</button></p>}
    <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const file = data.get("file");
      if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) { setError("Choose a file between 1 byte and 5 MB."); return; }
      setError(""); setNotice(""); setBusy(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
        const receipt: HandoffReceipt = await api("/api/brain/handoff", { stage: stage.id, fileName: file.name, base64: btoa(binary), approvalRef: data.get("approval"), approved: data.has("approved"), sourceId: data.get("source"), audience: data.get("audience"), tableKind: intakeType });
        const delivered = targets.every(([id]) => receipt.destinations[id].status === "uploaded");
        setNotice(delivered ? (intakeType !== "document" ? "Business table imported. The BusinessBrain dashboard now uses uploaded data." : receipt.indexed ? "Delivered to both destinations and indexed." : "Delivered to both destinations.") : "Handoff saved. Re-submit the same file to retry the pending destination.");
        if (delivered) form.reset();
        await reload();
      } catch (reason) { setError((reason as Error).message); }
      finally { setBusy(false); }
    }}>
      {stage.id === "intake" && <label>Upload type<select value={intakeType} onChange={(event) => setIntakeType(event.target.value)}><option value="document">Knowledge document</option>{Object.entries(BUSINESS_TABLES).map(([id, table]) => <option key={id} value={id}>{table.title} CSV</option>)}</select></label>}
      {stage.id === "intake" && intakeType === "document" && <label>Source category<select name="source" required defaultValue=""><option value="" disabled>Select a source</option>{sources.map((source: { id: string; title: string }) => <option key={source.id} value={source.id}>{source.title}</option>)}</select></label>}
      {stage.id === "intake" && intakeType === "document" && <label>Retrieval audience<select name="audience" required defaultValue=""><option value="" disabled>Select an audience</option><option value="company">All department bots</option>{catalog.map(({ id, name }) => <option key={id} value={id}>{name} only</option>)}</select></label>}
      {stage.id === "intake" && intakeType !== "document" && <p className="note"><a href={`/api/brain/business-template?kind=${intakeType}`} download>Download CSV template</a> · Executive analytics</p>}
      <label>File<input key={accept} name="file" type="file" accept={accept} required /></label>
      <label>Owner approval reference<input name="approval" maxLength={200} required /></label>
      <label className="approval-check"><input name="approved" type="checkbox" required />Approved for both destinations</label>
      <button type="submit" className="btn" disabled={!ready || busy || checking}>{busy ? "Uploading…" : "Upload to GitHub and Drive"}</button>
    </form>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
    {receipts.length > 0 && <ul className="handoff-receipts" aria-label="File handoff receipts">{receipts.map((file) => <li key={file.id}>
      <strong>{file.name}</strong>{file.indexed && <span className="badge success">Indexed</span>}
      {file.withdrawnAt && <span className="badge neutral">{file.restoring ? "Restore pending" : "Withdrawn from index"}</span>}
      {file.pages !== undefined && <small>Text extracted from {file.textPages} of {file.pages} PDF pages.</small>}
      {targets.map(([id, label]) => {
        const result = file.destinations[id];
        return <small key={id}>{result.url ? <a href={result.url} target="_blank" rel="noreferrer">{label} receipt</a> : `${label} · ${result.detail || result.status}`}</small>;
      })}
    </li>)}</ul>}
  </div>;
}

function SourceLifecycle({ inventory, reload, openIntake }: { inventory: SourceInventory; reload: () => Promise<void>; openIntake: () => void }) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const source = inventory.sources.find(({ id }) => id === selected);
  return <section className="pad stage-handoff" aria-label="Manage indexed sources">
    <div className="ch"><h3>Indexed sources</h3><button type="button" className="btn ghost sm" onClick={openIntake}>Open Collection &amp; handoff</button></div>
    <p className="note">Upload a replacement with the same file name and source category, then evaluate and deploy. To restore a withdrawn source, use a fresh owner approval reference.</p>
    {inventory.sources.length ? <ul className="handoff-receipts">{inventory.sources.map((item) => <li key={item.id}>
      <strong>{item.name}</strong>
      <span className={`badge ${item.serving ? "success" : "neutral"}`}>{item.current ? "In active release" : item.serving ? "Replacement staged" : item.eligible ? "Awaiting release" : "Excluded by ownership"}</span>
      <small>{item.audience === "company" ? "All department bots" : catalog.find(({ id }) => id === item.audience)?.name || item.audience} · {item.revisions} indexed {item.revisions === 1 ? "version" : "versions"}</small>
      <button type="button" className="btn ghost sm" aria-label={`Withdraw source ${item.name}`} disabled={busy} onClick={() => { setSelected(item.id); setError(""); setFeedback(""); }}>Withdraw source</button>
    </li>)}</ul> : <p className="note">There are no private indexed sources yet.</p>}
    {source && <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setBusy(true); setError("");
      try {
        await api("/api/brain/sources/withdraw", { documentId: source.id, reason: data.get("reason") });
        await reload();
        setSelected("");
        setFeedback(`${source.name} was withdrawn from BusinessBrain and the department bots.`);
      } catch (reason) { setError((reason as Error).message); }
      finally { setBusy(false); }
    }}>
      <h4>Withdraw {source.name}</h4>
      <p className="note">This immediately removes every indexed version of this source. Archived copies remain in GitHub and Drive under their own permissions.</p>
      <label>Withdrawal reason<textarea name="reason" rows={2} maxLength={500} required /></label>
      <div className="controls">
        <button type="submit" className="btn" disabled={busy}>{busy ? "Withdrawing…" : "Confirm withdrawal"}</button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => setSelected("")}>Cancel</button>
      </div>
    </form>}
    {feedback && <p role="status">{feedback}</p>}
    {error && <p role="alert">{error}</p>}
    {inventory.withdrawals.length > 0 && <details><summary>Withdrawal history ({inventory.withdrawals.length})</summary><ul className="handoff-receipts">{inventory.withdrawals.map((event, index) => <li key={`${event.at}:${index}`}>
      <strong>{event.name}</strong><small>{updatedLabel(event.at)} · {event.actor} · {event.revisions} removed</small><small>{event.reason}</small>
    </li>)}</ul></details>}
  </section>;
}

function ResetControl({ mode, workspaceId, reload }: { mode: "uploads" | "business"; workspaceId: string; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const title = mode === "business" ? "Business reset" : "Remove all uploaded data";
  return <section className="card pad reset-control" aria-label={title}>
    <h2>{title}</h2>
    <p>{mode === "business" ? "Clear the BusinessBrain, analytics, and every department’s activations, tasks, drafts and automations." : "Clear indexed documents, imported tables, and the current release. Department work records are kept."} GitHub and Drive keep their archive copies.</p>
    {open ? <form className="stack" onSubmit={async (event) => {
      event.preventDefault();
      setBusy(true); setNotice("");
      try {
        await api("/api/brain/reset", { mode, confirmation, workspaceId });
        await reload();
        setOpen(false); setConfirmation(""); setNotice("Reset complete. The portal is ready for fresh uploads.");
      } catch (error) { setNotice((error as Error).message); }
      finally { setBusy(false); }
    }}>
      <label>Type RESET to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></label>
      <div className="controls"><button type="submit" className="btn reset-button" disabled={busy || confirmation !== "RESET"}>{busy ? "Resetting…" : `Confirm ${title.toLowerCase()}`}</button><button type="button" className="btn ghost" disabled={busy} onClick={() => { setOpen(false); setConfirmation(""); }}>Cancel</button></div>
    </form> : <button type="button" className="btn reset-button" onClick={() => { setOpen(true); setNotice(""); }}>{title}</button>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}

function BusinessFiles({ tables, reload }: { tables: NonNullable<Access["datasets"]>; reload: () => Promise<void> }) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <section className="pad stage-handoff" aria-label="Uploaded business tables">
    <h3>Business tables</h3>
    {tables.filter((table) => table.handoffId).length ? <ul className="handoff-receipts">{tables.filter((table) => table.handoffId).map((table) => <li key={table.id}>
      <strong>{table.source}</strong><small>{table.rows} rows · {BUSINESS_TABLES[table.id as keyof typeof BUSINESS_TABLES]?.title}</small>
      {selected === table.id ? <div className="controls"><button className="btn reset-button sm" type="button" disabled={busy} onClick={async () => {
        setBusy(true); setError("");
        try { await api("/api/brain/tables/remove", { kind: table.id, handoffId: table.handoffId }); setSelected(""); await reload(); }
        catch (reason) { setError((reason as Error).message); }
        finally { setBusy(false); }
      }}>Confirm removal</button><button className="btn ghost sm" type="button" disabled={busy} onClick={() => setSelected("")}>Cancel</button></div> :
        <button className="btn ghost sm" type="button" onClick={() => setSelected(table.id)}>Remove from dashboard</button>}
    </li>)}</ul> : <p className="note">Upload an approved CSV to populate the BusinessBrain dashboard.</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

function DemoSources({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  async function ingest() {
    setError("");
    setRunning(true);
    try {
      const plan = await api("/api/brain/demo/plan", {});
      setBusy(`0 of ${plan.files.length}`);
      for (let index = 0; index < plan.files.length; index += 1) {
        await api("/api/brain/demo/file", { path: plan.files[index].path });
        setBusy(`${index + 1} of ${plan.files.length}: ${plan.files[index].path}`);
        if (index % 4 === 3) await reload();
      }
      await reload();
      setBusy("Indexed.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setRunning(false); }
  }
  const done = state.demo?.filesDone || 0;
  const total = state.demo?.filesTotal || 0;
  return <section className="card band-card lift"><div className="card-band sky">Connected sources</div><div className="pad stack">
    <p className="note">These two links are Ethikcorp’s demo sources. GitHub is public. Drive is fetched first and, if Google asks for a sign-in, the preview says so and continues from GitHub.</p>
    {state.demo && <div className="controls"><a href={state.demo.github} target="_blank" rel="noreferrer">Demo repository</a><a href={state.demo.driveUrl} target="_blank" rel="noreferrer">Demo Drive folder</a></div>}
    <p>{state.demo?.drive?.detail || "Drive has not been checked yet."}</p>
    {state.portalMode === "aqionteam" && <button className="btn ghost" type="button" onClick={async () => { try { await api("/api/brain/ownership-sample", {}); setBusy("Demo ownership sample imported."); await reload(); } catch (reason) { setError((reason as Error).message); } }}>Use the demo ownership sample</button>}
    {state.portalMode !== "customer" && <button className="btn" type="button" onClick={ingest} disabled={running}>{running ? "Ingesting demo sources…" : "Ingest demo sources"}</button>}
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
    <ul>{files.map((file) => <li key={file.path}>{file.status || (file.pass ? "ingested" : "failed")} · {file.path}{file.rows ? ` · ${file.rows} rows` : ""}{file.passages ? ` · ${file.passages} passages` : ""} · {file.source}{file.driveId ? ` · Drive ${file.driveId}` : ""}{file.reason ? ` · ${file.reason}` : ""}{file.schema?.length ? ` · ${file.schema.map((column) => `${column.name}:${column.type}`).join(", ")}` : ""}</li>)}</ul>
  </div>;
}

function Ownership({ state, reload }: { state: Access; reload: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  return <section className="card band-card lift"><div className="card-band coral">1. Source ownership</div><div className="pad"><p className="note">{state.portalMode === "customer" ? "Step 1. Upload the completed .xlsx. All 18 sources must be present. BusinessBrain and Businessbots stay locked until this file is valid. A valid import starts the build." : "Upload the completed .xlsx. All 18 sources must be present. Row errors stay on screen and nothing is stored until the file is valid."}</p>
    <p><a href="/api/brain/ownership-template" download>Download the ownership workbook template</a></p>
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
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState("");
  return <section className="card band-card lift"><div className="card-band sky">Department activation</div><div className="pad">
    <p>Confirm the departments that are ready to use the approved BusinessBrain release.</p>
    {!state.handoff && <button type="button" className="btn ghost" onClick={async () => { try { const result = await api("/api/brain/bootstrap-dev", {}); setLink(result.url || ""); } catch (reason) { setError((reason as Error).message); } }}>Issue the development invite</button>}
    {link && <p className="note">Give this URL only to the development team. It is signed with the existing session secret.</p>}
    {link && <p><a href={link}>{link}</a></p>}
    <div className="ch"><h2>Confirm departments</h2></div>
    {error && <p role="alert">{error}</p>}
    {state.departments.map((department) => <div className="plainrow" key={department.id}><span className="navdot" style={{ background: faceFor(department.id).bg, width: 14, height: 14, boxShadow: "inset 0 0 0 1.5px #03050A" }} /><span><b>{department.name}</b><small>{department.workflows.join(", ")}</small></span><button type="button" className="btn sm" disabled={department.confirmed || Boolean(confirming)} onClick={async () => {
      setError(""); setConfirming(department.id);
      try { await api("/api/brain/confirm", { id: department.id }); await reload(); }
      catch (reason) { setError((reason as Error).message); }
      finally { setConfirming(""); }
    }}>{department.confirmed ? "Confirmed" : confirming === department.id ? "Confirming…" : "Confirm"}</button></div>)}
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
  llm?: string;
  citations?: { document: string; excerpt: string; heading?: string; url?: string }[];
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
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 50);
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
  const uploaded = state.businessMode === "uploaded";
  return <div className="board">
    <header className="page-head">
      <h1>Business overview</h1>
      <p className="sub">{uploaded ? "Revenue, pipeline and utilisation calculated from the uploaded business tables." : "Recognised revenue, pipeline, utilisation and win rate from the indexed sample tables."}</p>
      <div className="controls">
        {Boolean(overview?.periods.length) && <label>Revenue period<select aria-label="Period" value={overview?.period || period} onChange={(event) => { setPeriod(event.target.value); setFilter(null); }}>{overview?.periods.map((item: { id: string; label: string }) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        <span className="note">Currency AED</span>
        {state.model?.updated && <span className="note">{updatedLabel(state.model.updated)}</span>}
      </div>
      {!uploaded && banner && <div className="info-banner" role="status"><span>Sample data · illustrative figures.</span><button type="button" onClick={() => { sessionStorage.setItem("bos-sample-banner", "off"); setBanner(false); }}>Dismiss</button></div>}
      {uploaded && Boolean(state.datasets?.length) && <div className="info-banner"><span>Source files · {state.datasets?.map((table) => `${table.source} (${table.rows} rows)`).join(" · ")}</span></div>}
      {filter && <div className="filter-pill">Filtered by chat: {filter} <button type="button" onClick={() => window.dispatchEvent(new Event("bos-undo"))}>Undo</button></div>}
    </header>
    {!overview && <section className="card pad empty-card"><h2>No business data yet</h2><p>{uploaded ? "Upload a business CSV in Collection & handoff to populate this dashboard." : "Import approved business CSVs in BusinessBrain PM or load the demo tables."}</p></section>}
    {overview && <div className="kpi-row">{(overview.kpis as KpiModel[]).map((kpi) => <KpiTile key={kpi.id} kpi={kpi} onSelect={() => { setMode(kpi.mode || "revenue"); setFilter(null); }} />)}</div>}
    {overview && <div className="chart-row">{(overview.charts as ChartSpec[]).map((chart) => <div className={`chart-card span-${chart.span || 6} ${highlight === chart.id ? "flash" : ""} ${pending ? "pending" : ""}`} key={chart.id}><LiveChart spec={chart} /></div>)}</div>}
    {state.model && Boolean(state.model.clients?.length || state.model.openDeals?.length) && <DataTables key={state.model.updated} model={state.model} uploaded={uploaded} />}
    {overview && !overview.charts.length && <section className="card pad empty-card"><h2>No rows for this view</h2><button type="button" className="btn ghost" onClick={() => setPeriod("last-6")}>Change period</button></section>}
    {!uploaded && fixes.length > 0 && <><div className="span-12 sec-h"><h2>Where to find AED 1M more</h2><span className="note">Revenue fixes from the indexed tables</span></div><OpportunityList items={fixes} reload={reload} editable={state.workspace?.role !== "ceo"} /></>}
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

function DataTables({ model, uploaded }: { model: NonNullable<Access["model"]>; uploaded: boolean }) {
  const [clientPage, setClientPage] = useState(0);
  const [dealPage, setDealPage] = useState(0);
  const clients = model.clients || [];
  const deals = model.openDeals || [];
  const pageSize = 7;
  const clientSlice = clients.slice(clientPage * pageSize, clientPage * pageSize + pageSize);
  const dealSlice = deals.slice(dealPage * pageSize, dealPage * pageSize + pageSize);
  return <>
      {clients.length > 0 && <section className="card chart-card data-table span-6">
      <div className="card-h"><h3>Top clients</h3><span className="meta">Recognised revenue, TTM · AED</span>{!uploaded && <span className="badge neutral">Sample</span>}</div>
      <div className="tbl-wrap"><table className="tbl clients"><colgroup><col style={{ width: "54%" }} /><col style={{ width: "18%" }} /><col style={{ width: "28%" }} /></colgroup><thead><tr><th>Client</th><th>Status</th><th className="num">Revenue</th></tr></thead><tbody>{clientSlice.map((row) => <tr key={row.name}><td className="client-cell" title={`${row.name}, ${row.line}`}><b>{row.name}</b><small>{row.line}</small></td><td><span className={row.status === "Active" ? "badge success" : "badge neutral"}>{row.status}</span></td><td className="num">{formatFull(row.revenue, "AED").replace("AED\u00A0", "")}</td></tr>)}</tbody></table></div>
      <div className="pager"><span>{clientPage * pageSize + 1}–{Math.min(clients.length, (clientPage + 1) * pageSize)} of {clients.length}</span><button type="button" className="btn ghost sm" disabled={clientPage === 0} onClick={() => setClientPage((page) => page - 1)}>Previous</button><button type="button" className="btn ghost sm" disabled={(clientPage + 1) * pageSize >= clients.length} onClick={() => setClientPage((page) => page + 1)}>Next</button></div>
    </section>}
      {deals.length > 0 && <section className="card chart-card data-table span-6">
      <div className="card-h"><h3>Open pipeline</h3><span className="meta">Gross AED {formatFull(model.grossOpen || 0, "AED").replace("AED\u00A0", "")} · weighted {formatFull(model.weighted, "AED")}</span>{!uploaded && <span className="badge neutral">Sample</span>}</div>
      <div className="tbl-wrap"><table className="tbl deals"><colgroup><col style={{ width: "40%" }} /><col style={{ width: "18%" }} /><col style={{ width: "16%" }} /><col style={{ width: "10%" }} /><col style={{ width: "16%" }} /></colgroup><thead><tr><th>Client</th><th>Stage</th><th className="num">Value</th><th className="num">Prob.</th><th className="num">Weighted</th></tr></thead><tbody>{dealSlice.map((row) => <tr key={`${row.client}-${row.stage}`}><td className="clip2" title={row.client}><span>{row.client}</span></td><td>{row.stage}</td><td className="num">{row.value.toLocaleString("en-AE")}</td><td className="num">{row.prob}%</td><td className="num">{row.weighted.toLocaleString("en-AE")}</td></tr>)}</tbody></table></div>
      <div className="pager"><span>{dealPage * pageSize + 1}–{Math.min(deals.length, (dealPage + 1) * pageSize)} of {deals.length}</span><button type="button" className="btn ghost sm" disabled={dealPage === 0} onClick={() => setDealPage((page) => page - 1)}>Previous</button><button type="button" className="btn ghost sm" disabled={(dealPage + 1) * pageSize >= deals.length} onClick={() => setDealPage((page) => page + 1)}>Next</button></div>
    </section>}
  </>;
}

function OpportunityList({ items, reload, editable }: { items: NonNullable<Access["opportunities"]>; reload: () => Promise<void>; editable: boolean }) {
  if (!items.length) return null;
  return <>{items.slice(0, 4).map((item) => <article className="card fix span-3" key={item.id}><h3>{item.title}</h3><div className="impact">{item.impactAed == null ? "—" : formatFull(item.impactAed, "AED")}</div><p className="note">{item.confidence} · {item.owner}</p><details className="how"><summary>How we calculated</summary><p>{item.formula}</p></details>{editable && <button type="button" className="btn ghost sm" onClick={async () => { await api("/api/brain/task", item); await reload(); }}>Create task</button>}</article>)}</>;
}

function DeptFacts({ name, model }: { name: string; model?: Access["model"] }) {
  const row = model?.hours?.find((item) => item.department === name);
  if (!row) return null;
  const util = row.available ? Math.round((row.hours / row.available) * 1000) / 10 : 0;
  const bill = row.available ? Math.round((row.billable / row.available) * 1000) / 10 : 0;
  const utilTarget = model?.targets?.find((item) => item.metric === "utilisation_pct" && item.subject === name)?.value;
  const billTarget = model?.targets?.find((item) => item.metric === "billable_pct" && item.subject === name)?.value;
  const utilBelow = utilTarget != null && util < utilTarget;
  const billBelow = billTarget != null && bill < billTarget;
  return <div className="kpi-row">
    <article className={`kpi-tile ${utilBelow ? "below" : ""}`}><span className="kpi-label">Utilisation</span><span className="kpi-value">{util.toFixed(1)}%</span><span className="kpi-target">{utilTarget == null ? "No target supplied" : `Target ${utilTarget}%`}</span>{utilTarget == null ? <span className="badge neutral">No target</span> : utilBelow ? <span className="badge low">▼ Below target</span> : <span className="badge success">✓ On target</span>}</article>
    <article className={`kpi-tile ${billBelow ? "below" : ""}`}><span className="kpi-label">Billable</span><span className="kpi-value">{bill.toFixed(1)}%</span><span className="kpi-target">{billTarget == null ? "No target supplied" : `Target ${billTarget}%`}</span>{billTarget == null ? <span className="badge neutral">No target</span> : billBelow ? <span className="badge low">▼ Below target</span> : <span className="badge success">✓ On target</span>}</article>
    <article className="kpi-tile"><span className="kpi-label">Headcount</span><span className="kpi-value">{row.headcount ?? "—"}</span></article>
  </div>;
}

function Bots({ hash, state, reload, canValidate }: { hash: string; state: Access; reload: () => Promise<void>; canValidate: boolean }) {
  const [, selected, view] = hash.replace("#", "").split("/");
  const process = view === "process";
  const department = catalog.find((item) => item.id === selected);
  const built = Math.round(state.departments.filter((item) => item.confirmed).length / 9 * 100);
  const activeIds = new Set(state.release?.active?.departments || []);
  if (!department) return <div className="board">
    <header className="page-head"><h1>Businessbots</h1></header>
    <div className="dept-grid span-12">{catalog.map((item) => {
      const active = activeIds.has(item.id);
      const confirmed = state.departments.some((entry) => entry.id === item.id && entry.confirmed);
      return <a className={`dept-card dept-navigation-tile ${active ? "active" : confirmed ? "confirmed" : "pending"}`} key={item.id} href={`#bots/${item.id}`} aria-label={`Open workspace for ${item.name}`}>
        <span className="stage-mark"><DeptIcon id={item.id} /></span>
        <h2>{item.name}</h2>
        <span className={`badge ${active ? "success" : confirmed ? "neutral" : "low"}`}>{active ? "Active" : confirmed ? "Ready to activate" : "Awaiting confirmation"}</span>
        <span className="dept-tile-arrow" aria-hidden="true">→</span>
      </a>;
    })}</div>
  </div>;
  return <>
    <header className="page-head">
      {!state.workspace?.department && <p className="note"><a href="#bots">Businessbots</a> / {department.name}</p>}
      <h1>{department.name}</h1>
      <p className="sub">{department.mandate}</p>
      {!state.workspace?.department && <div className="controls"><label>Department<select aria-label="Department" value={department.id} onChange={(event) => { window.location.hash = `#bots/${event.target.value}`; }}>{catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!state.workspace && <a className="btn ghost" href={`#bots/${department.id}/process`}>Process detail</a>}<span className={activeIds.has(department.id) ? "badge success" : "badge neutral"}>{activeIds.has(department.id) ? "Active" : state.departments.find((item) => item.id === department.id)?.confirmed ? "Confirmed" : "Awaiting confirmation"}</span></div>}
    </header>
    {state.portalMode === "customer" && !state.departments.find((item) => item.id === department.id)?.confirmed ? <Locked percent={built} what="bots" departments={state.departments} portalMode={state.portalMode} step1 /> : null}
    {state.workspace && <DepartmentSupervision key={department.id} id={department.id} active={activeIds.has(department.id)} editable canValidate={canValidate} shared={state.workspace.mode === "team"} />}
    {!state.workspace?.department && <DeptFacts name={department.name} model={state.model} />}
    {!state.workspace && <BotDesk departmentId={department.id} process={process} state={state} reload={reload} />}
    {state.role === "dev" && <button type="button" className="btn" onClick={async () => { await api("/api/brain/confirm", { id: department.id }); await reload(); }}>Confirm this department</button>}
  </>;
}

function BotDesk({ departmentId, process, state, reload }: { departmentId: string; process: boolean; state: Access; reload: () => Promise<void> }) {
  const map = state.workflowMaps?.[departmentId];
  const saved = (state.automations || []).filter((item) => item.departmentId === departmentId);
  const partners = state.departments.filter((item) => item.id !== departmentId);
  const spec = map ? processSpec(map) : null;
  const stages = stageSpec(state.model?.openDeals || []);
  const deals = state.model?.openDeals || [];
  return <div className="board">
    {spec ? <div className="chart-card span-7"><LiveChart spec={spec} /></div> : <p className="note span-12">Ingest the demo sources to load this department’s workflow file.</p>}
    <div className="chart-card span-5"><LiveChart spec={stages} /></div>
    <section className="card chart-card data-table span-12"><div className="card-h"><h3>Open deals</h3><span className="meta">Gross AED {(state.model?.grossOpen || 0).toLocaleString("en-AE")} · weighted AED {(state.model?.weighted || 0).toLocaleString("en-AE")}</span><span className="badge neutral">Sample</span></div>
      <div className="tbl-wrap"><table className="tbl"><colgroup><col style={{ width: "28%" }} /><col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "10%" }} /><col style={{ width: "14%" }} /><col style={{ width: "16%" }} /></colgroup><thead><tr><th>Client</th><th>Stage</th><th className="num">Value</th><th className="num">Prob.</th><th className="num">Weighted</th><th>Owner</th></tr></thead><tbody>{deals.map((row) => <tr key={`${row.client}-${row.stage}`}><td title={row.client}>{row.client}</td><td>{row.stage}</td><td className="num">{row.value.toLocaleString("en-AE")}</td><td className="num">{row.prob}%</td><td className="num">{row.weighted.toLocaleString("en-AE")}</td><td>{row.owner || row.department}</td></tr>)}</tbody></table></div>
    </section>
    {process && map?.flows?.filter((flow) => flow.steps.length).map((flow) => <section className="card pad span-12" key={flow.title}><h2>{flow.title}</h2><p className="note">{flow.weeklyHours} h / week in the sample workflow file.</p><ol className="step-list">{flow.steps.map((step, index) => <li key={step}><b>{index + 1}.</b> <span>{sentence(step)}</span>{isBottleneck(step, map.friction || []) && <span className="badge low">▼ Bottleneck</span>}</li>)}</ol></section>)}
    {map?.proposals?.length ? <section className="card pad span-12"><div className="ch"><h2>Proposed automations</h2><span className="badge neutral">Sample</span></div><div className="fixes">{map.proposals.map((item) => <article className="fix" key={item.id}><h3>{item.name}</h3><ol className="step-list">{(item.steps || []).slice(0, 5).map((step, index) => <li key={step}><b>{index + 1}.</b> <span>{sentence(step)}</span></li>)}</ol><p className="note">{item.hoursSavedPerMonth} h / month. Tools: {item.tools?.join(", ") || "department checklist"}.</p><div className="impact">{item.impactAed == null ? "—" : `${formatFull(item.impactAed, "AED")} / month`}</div><p>{item.revenueAngle}</p><details className="how"><summary>How we calculated</summary><p>{item.assumption}. {item.formula}. {item.aedFormula}</p></details>{state.role === "dev" && <button type="button" className="btn" onClick={async () => { await api("/api/brain/automation", item); await reload(); }}>Build automation</button>}</article>)}</div></section> : null}
    {saved.length > 0 && <section className="card pad span-12"><div className="ch"><h2>Automations</h2><span className="badge neutral">Sample</span></div>{saved.map((item) => <div className="plainrow" key={item.id}><span /><span><b>{item.name}</b><small>{item.impactAed ? `${formatFull(item.impactAed, "AED")} / month. ` : ""}{item.runs.map((run) => run.note).join(" ") || "No runs yet."}</small></span><span><button type="button" className="btn ghost" onClick={async () => { await api("/api/brain/automation/toggle", { id: item.id }); await reload(); }}>{item.enabled ? "On" : "Off"}</button> <button type="button" className="btn" onClick={async () => { await api("/api/brain/automation/run", { id: item.id }); await reload(); }}>Simulated run</button></span></div>)}</section>}
    <section className="card pad span-12"><div className="ch"><h2>Partner departments</h2></div>{partners.map((item) => <div className="plainrow" key={item.id}><span /><span><b>{item.name}</b><small>{item.confirmed ? "Confirmed" : "Not confirmed"}</small></span><span className={item.confirmed ? "badge success" : "badge neutral"}>{item.confirmed ? "Confirmed" : "Waiting"}</span></div>)}</section>
  </div>;
}

function processSpec(map: NonNullable<Access["workflowMaps"]>[string]): ChartSpec {
  const series = map.flows.filter((flow) => flow.steps.length).flatMap((flow) => {
    const each = flow.weeklyHours / Math.max(1, flow.steps.length);
    return flow.steps.map((step) => ({ name: step, value: Math.round(each * 10) / 10, belowTarget: isBottleneck(step, map.friction || []), statusLabel: "▼ Bottleneck" }));
  }).sort((left, right) => right.value - left.value);
  const top = series[0];
  return { id: "chart-process-hours", type: "bar", title: "Hours per week by step", unit: "h", sample: true, span: 7, mark: "green", series, aria: top ? `Hours per week by step. Highest: ${top.name} ${top.value} h.` : "Hours per week by step." };
}

function stageSpec(deals: { stage: string; value: number }[]): ChartSpec {
  const preferred = ["Qualification", "Discovery", "Proposal", "Negotiation"];
  const totals = new Map<string, number>();
  for (const deal of deals) totals.set(deal.stage, (totals.get(deal.stage) || 0) + deal.value);
  const names = [...preferred.filter((name) => totals.has(name)), ...[...totals.keys()].filter((name) => !preferred.includes(name))];
  const series = names.map((name) => ({ name, value: totals.get(name) || 0 }));
  return { id: "chart-pipeline-stage", type: "column", title: "Gross open pipeline by stage", unit: "AED", sample: true, span: 5, series, aria: series.length ? `Gross open pipeline by stage. ${series.map((item) => `${item.name} AED ${item.value}`).join(", ")}.` : "No open deals." };
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

type ChatLine = { who: string; text?: string; bullets?: { label: string; value: number; unit?: string }[]; steps?: { tool: string; detail: string }[]; citations?: Insight["citations"]; llm?: string; chartId?: string; chartLabel?: string; error?: boolean; retry?: string };

function ChatDock({ open, onToggle, role, area, departmentId, placeholder, onResult, release, uploadedAnalytics }: { open: boolean; onToggle: () => void; role: "customer" | "dev"; area: string; departmentId?: string; placeholder?: string; onResult: (result: Insight) => void; release: boolean; uploadedAnalytics?: boolean }) {
  const [text, setText] = useState("");
  const [asking, setAsking] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([{ who: "BusinessBrain", text: release ? "Ask a question about the approved sources in this release." : "Ask a question about your business. Charts update with the answer." }]);
  async function ask(event?: React.FormEvent, preset?: string) {
    event?.preventDefault();
    const question = (preset || text).trim();
    if (!question || asking) return;
    setText("");
    if (!open) onToggle();
    setAsking(true);
    window.dispatchEvent(new CustomEvent("bos-pending", { detail: true }));
    setLines((prev) => [...prev, { who: "You", text: question }, { who: "BusinessBrain", text: "Analysing…" }]);
    const steps: { tool: string; detail: string }[] = [];
    try {
      const response = await fetch(release ? "/api/brain/ask-release" : "/api/brain/ask", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json", accept: "application/x-ndjson" }, body: JSON.stringify({ question, area, departmentId }) });
      if (!response.ok || !response.body || !response.headers.get("content-type")?.includes("ndjson")) {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Request failed");
        finish(result, result.steps || steps, question);
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
    } catch (error) {
      setLines((prev) => prev.filter((line) => line.text !== "Analysing…").concat({ who: "BusinessBrain", text: (error as Error).message || "Couldn't get an answer.", error: true, retry: question }));
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
    if (!release && !result.refused) onResult({ ...result, steps });
    const chartLabel = result.view ? filterLabel(result.view) : "";
    setLines((prev) => prev.filter((line) => line.text !== "Analysing…").concat({ who: "BusinessBrain", text: result.bullets?.length ? undefined : result.answer, bullets: result.bullets, citations: result.citations, llm: result.llm, steps: role === "dev" ? steps : undefined, chartId: release || result.refused ? undefined : chartIdFor(result.view || "revenue"), chartLabel: result.refused ? undefined : chartLabel }));
  }
  return <aside className="chat-dock" aria-label="BusinessBrain chat">
    {open && <div className="chat-log">{lines.map((line, index) => <article className={line.who === "You" ? "bubble you" : "bubble"} key={index}>
      {line.who !== "You" && <span className="avatar" aria-hidden="true">EC</span>}
      <div>
        {line.text === "Analysing…" ? <div className="skeleton lines" aria-live="polite"><span /><span /><span /><small>Analysing…</small></div> : null}
        {line.bullets?.length ? <ul className="figure-list">{line.bullets.slice(0, 5).map((item) => <li key={item.label}><span>{item.label}</span><b>{formatFull(Number(item.value), item.unit)}</b></li>)}</ul> : line.text && line.text !== "Analysing…" ? <p>{line.text}</p> : null}
        {line.citations?.length ? <ol className="chat-sources" aria-label="Sources">{line.citations.map((item, position) => <li key={position}>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">{item.document}</a> : item.document}{item.heading ? ` · ${item.heading}` : ""}</li>)}</ol> : null}
        {release && line.citations?.length ? <small className="note">{line.llm === "azure-release" ? "Model-assisted answer" : line.llm === "calculated" ? "Calculated from uploaded data" : "Cited passage"}</small> : null}
        {line.chartId && <button type="button" className="chip" onClick={() => document.getElementById(line.chartId || "")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Updated: {line.chartLabel}</button>}
        {line.chartId && <button type="button" className="linkish" onClick={() => window.dispatchEvent(new Event("bos-undo"))}>Undo</button>}
        {line.error && line.retry && <button type="button" className="btn ghost sm" onClick={() => ask(undefined, line.retry)}>Try again</button>}
        {role === "dev" && line.steps?.length ? <details className="trace"><summary>How this answer was produced</summary><ol>{line.steps.map((step, stepIndex) => <li key={stepIndex}><b>{step.tool}</b> {step.detail}</li>)}</ol></details> : null}
      </div>
    </article>)}</div>}
    <div className="chat-bar">
      {!open && <span className="dock-mark" aria-hidden="true">EC</span>}
      {(!release || uploadedAnalytics) && <div className="prompts">{(uploadedAnalytics ? ["Total revenue", "Weighted pipeline", "Utilisation"] : PROMPTS).map((prompt) => <button type="button" className="chip" key={prompt} onClick={() => ask(undefined, prompt)}>{prompt}</button>)}</div>}
      <form className="ask" onSubmit={ask}>
        <textarea aria-label="Question" rows={1} value={text} placeholder={placeholder || "Ask about revenue, pipeline or utilisation"} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(); } }} />
        <button className="btn" type="submit" disabled={asking}>Ask</button>
        <button type="button" className="btn ghost icon-btn" aria-label={open ? "Collapse chat" : "Expand chat"} aria-expanded={open} onClick={onToggle}>{open ? "▾" : "▴"}</button>
      </form>
    </div>
  </aside>;
}
