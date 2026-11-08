import React, { useEffect, useMemo, useState } from "react";
import { answerQuestion, formationReport } from "../shared/guide-rules.mjs";
import { sources, stages } from "./data";

type Records = Record<string, { status?: string; owner?: string; locator?: string; approvalRef?: string; note?: string }>;
type Follow = { id: string; title: string; owner: string; due: string; note: string; state: "draft" | "pending" | "approved"; createdAt: string };
const FOLLOW_KEY = "superbrain-pm-followups-v1";
const faqs = [
  ["Does a checklist tick approve the data?", "No. It records that the evidence was reviewed in this browser. Upload still needs an owner, a locator and an approval reference, and only five categories can be uploaded."],
  ["Will this send a reminder to the customer?", "No. Follow-ups stay in this browser as draft, pending or approved. Nothing is emailed or scheduled."],
  ["Is the brain UAE-resident because the preview loads?", "No. The preview is a global Cloudflare front end. Storage, backups, logs, embeddings, inference and vendor egress are separate and currently unverified."],
  ["Can we fine-tune to keep facts current?", "No. Fine-tuning is not started and is not a substitute for retrieval. It would need a demonstrated gap, an approved dataset and a verified training location."]
];

function loadFollows(): Follow[] {
  try { const raw = JSON.parse(localStorage.getItem(FOLLOW_KEY) || "[]"); return Array.isArray(raw) ? raw : []; }
  catch { return []; }
}

export function GuideDock({ checked, records, githubReady }: { checked: Record<string, boolean>; records: Records; githubReady: boolean | null }) {
  const report = useMemo(() => formationReport({ stages, sources, checked, records, githubReady: Boolean(githubReady) }), [checked, records, githubReady]);
  const [tab, setTab] = useState<"ask" | "missing" | "follow" | "voice">("ask");
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState(() => answerQuestion("", report));
  const [follows, setFollows] = useState<Follow[]>(loadFollows);
  const [consent, setConsent] = useState(false);
  const [voiceNote, setVoiceNote] = useState("Text is the default. Browser speech is off.");
  const synth = typeof window !== "undefined" && "speechSynthesis" in window;
  const Rec = typeof window !== "undefined" ? ((window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition) : undefined;
  useEffect(() => { localStorage.setItem(FOLLOW_KEY, JSON.stringify(follows)); }, [follows]);
  useEffect(() => { setReply(answerQuestion(question, report)); }, [report, question]);

  function speak() {
    if (!consent) { setVoiceNote("Consent is required before any speech. Browser speech may leave the device and is not a UAE route."); return; }
    if (!reply.speechSafe) { setVoiceNote("This reply stays on screen. It touches restricted material and will not be spoken."); return; }
    if (!synth) { setVoiceNote("Speech synthesis is not available in this browser. Use the text."); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(reply.answer);
    utter.lang = "en-GB";
    utter.onend = () => setVoiceNote("Spoken with this browser's speech engine. That engine is not attested as UAE processing.");
    window.speechSynthesis.speak(utter);
  }
  function listen() {
    if (!consent || !Rec) { setVoiceNote(Rec ? "Turn on consent before the microphone." : "Speech recognition is not available. Type the question."); return; }
    const rec = new Rec();
    rec.lang = "en-GB";
    rec.onresult = (event) => { const text = event.results?.[0]?.[0]?.transcript || ""; setQuestion(text); setTab("ask"); setVoiceNote("Transcript captured in the page only. It was not sent to a model."); };
    rec.onerror = () => setVoiceNote("Recognition failed in the browser. The question was not sent anywhere.");
    rec.start();
    setVoiceNote("Listening in the browser. Stop if the question includes confidential records.");
  }

  return <aside className="card pad" aria-label="Formation guide">
    <div className="eyebrow">Customer guide</div>
    <h2 style={{ font: "600 22px/1.2 var(--fd)", margin: "0 0 8px" }}>What happens next</h2>
    <p className="note">{report.next.title}. {report.next.why}</p>
    <div className="seg" role="tablist" aria-label="Guide sections" style={{ margin: "12px 0" }}>
      {([["ask", "Ask"], ["missing", "Missing"], ["follow", "Follow-ups"], ["voice", "Voice"]] as const).map(([id, label]) => <button key={id} className={tab === id ? "on" : ""} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    {tab === "ask" && <div className="stack">
      <form className="ask" onSubmit={(e) => { e.preventDefault(); setReply(answerQuestion(question, report)); }}>
        <input aria-label="Ask about the formation journey" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Who is missing? Can we upload HR?" />
        <button className="btn sm" type="submit">Answer</button>
      </form>
      <p>{reply.answer}</p>
      <div className="cite">{reply.citations.map((item: { label: string }) => <span className="pill b" key={item.label}>{item.label}</span>)}</div>
      <div className="faq">{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p className="note">{a}</p></details>)}</div>
    </div>}
    {tab === "missing" && <div className="stack">
      <p className="note">{report.missingOwners.length} categories have no named owner. {report.needsApproval.length} upload-eligible categories have no approval reference. GitHub token: {githubReady ? "present" : "not configured"}.</p>
      {report.missingOwners.slice(0, 8).map((source: { id: string; title: string }) => <a key={source.id} href="#pm/discovery">{source.title}</a>)}
      {!report.missingOwners.length && <div className="empty"><b>Owners are named</b><span>Locators and approval references can still be open.</span></div>}
    </div>}
    {tab === "follow" && <FollowUps follows={follows} setFollows={setFollows} />}
    {tab === "voice" && <div className="stack">
      <p><span className={`pill ${synth ? "b" : "a"}`}>{synth ? "Speech synthesis available" : "Speech synthesis unavailable"}</span> <span className={`pill ${Rec ? "b" : "a"}`}>{Rec ? "Recognition available" : "Recognition unavailable"}</span></p>
      <label className="note"><input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (!e.target.checked && synth) window.speechSynthesis.cancel(); }} /> I consent to this browser's speech engine for non-confidential guide text. I understand it may be processed outside the UAE and is not the company data plane.</label>
      <div className="row" style={{ display: "flex", gap: 8 }}>
        <button className="btn sm" type="button" onClick={speak} disabled={!reply.speechSafe}>Speak answer</button>
        <button className="btn ghost sm" type="button" onClick={listen}>Dictate question</button>
      </div>
      <p className="note" role="status">{voiceNote}</p>
      <div className="card pad" style={{ boxShadow: "none" }}>
        <h3>UAE speech adapter</h3>
        <p className="note">Disconnected. No endpoint, region attestation, retention schedule or server secret is configured. The fields stay disabled so a browser cannot pretend to be that route.</p>
        <label>Endpoint<input disabled placeholder="Not configured" /></label>
      </div>
    </div>}
  </aside>;
}

function FollowUps({ follows, setFollows }: { follows: Follow[]; setFollows: React.Dispatch<React.SetStateAction<Follow[]>> }) {
  return <div className="stack">
    <p className="note">Draft, pending and approved are local states. Approving does not send email, WhatsApp or a calendar invite.</p>
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const title = String(data.get("title") || "").trim();
      if (!title) return;
      setFollows((prev) => [{ id: crypto.randomUUID(), title, owner: String(data.get("owner") || ""), due: String(data.get("due") || ""), note: String(data.get("note") || ""), state: "draft", createdAt: new Date().toISOString() }, ...prev]);
      e.currentTarget.reset();
    }}>
      <input name="title" required placeholder="Follow-up the customer still needs" aria-label="Follow-up title" />
      <input name="owner" placeholder="Owner" aria-label="Follow-up owner" />
      <input name="due" type="date" aria-label="Follow-up date" />
      <textarea name="note" rows={2} placeholder="What you would say. This text stays here." aria-label="Follow-up note" />
      <button className="btn sm" type="submit">Save draft</button>
    </form>
    {follows.map((item) => <article key={item.id}>
      <strong>{item.title}</strong>
      <div className="cite"><span className={`pill ${item.state === "approved" ? "g" : item.state === "pending" ? "a" : "b"}`}>{item.state}</span>{item.owner && <span className="note">{item.owner}</span>}</div>
      <p className="note">{item.note}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {item.state === "draft" && <button className="btn ghost sm" type="button" onClick={() => setFollows((prev) => prev.map((row) => row.id === item.id ? { ...row, state: "pending" } : row))}>Mark pending</button>}
        {item.state !== "approved" && <button className="btn ghost sm" type="button" onClick={() => setFollows((prev) => prev.map((row) => row.id === item.id ? { ...row, state: "approved" } : row))}>Approve text</button>}
        <button className="btn ghost sm" type="button" onClick={() => setFollows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button>
      </div>
    </article>)}
    {!follows.length && <div className="empty"><b>No follow-ups</b><span>Add a draft when a customer owes a document.</span></div>}
  </div>;
}

type SpeechRec = { lang: string; start: () => void; onresult: (event: { results?: { 0?: { 0?: { transcript?: string } } } }) => void; onerror: () => void };

