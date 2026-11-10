// Nine build steps, in the order the current formation journey already uses.
// Steps 1 and 2 are the only customer forms. Later steps are Aqion's work
// unless a team member flags one as needing customer input.

/**
 * @typedef {"not_started" | "in_progress" | "waiting_on_customer" | "done"} StepStatus
 * @typedef {{ id: string, status: StepStatus, needsInput: boolean, progress: number, summary: string }} StepRecord
 * @typedef {{ n: number, id: string, name: string, teamName: string, customerInput: boolean, doing: string }} StepDef
 * @typedef {{ phase: 1 | 2, role: string, tab: string, step: string, dept: string }} Route
 */

export const STEPS = [
  { n: 1, id: "discovery", name: "Map your sources", teamName: "Discovery and inventory", customerInput: true, doing: "Name each source, its owner, and whether it is in, context-only, or excluded." },
  { n: 2, id: "collection", name: "Send the approved files", teamName: "Collection", customerInput: true, doing: "Receive only the approved public and internal files, with an owner and an original location." },
  { n: 3, id: "cleaning", name: "Keep the right version", teamName: "Cleaning and dedupe", customerInput: false, doing: "Aqion removes duplicates and keeps the signed or current version of each file." },
  { n: 4, id: "privacy", name: "Apply the data boundaries", teamName: "Data boundaries", customerInput: false, doing: "Aqion applies the exclusions from step 1: redaction, retention, and what never enters the brain." },
  { n: 5, id: "chunking", name: "Make sources traceable", teamName: "Chunking and metadata", customerInput: false, doing: "Aqion splits approved documents and attaches owner, date, sensitivity, and version." },
  { n: 6, id: "embeddings", name: "Build the search index", teamName: "Embeddings and vectors", customerInput: false, doing: "Aqion indexes the approved text. GitHub is the source. The index is a separate runtime." },
  { n: 7, id: "access", name: "Check who can see what", teamName: "Role-based access", customerInput: false, doing: "Aqion tests allowed and denied roles before any retrieved text can reach an answer." },
  { n: 8, id: "evaluation", name: "Test answer quality", teamName: "Evaluation", customerInput: false, doing: "Aqion runs the agreed questions and checks citations, refusals, and stale facts." },
  { n: 9, id: "refresh", name: "Keep it current", teamName: "Refresh cadence", customerInput: false, doing: "Aqion sets who updates, withdraws, and rechecks each source after go-live." }
];

const STATUSES = new Set(["not_started", "in_progress", "waiting_on_customer", "done"]);

export function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

/** @param {StepRecord} record */
export function showIndicator(record) {
  return Boolean(record && record.needsInput) && record.status !== "done";
}

/** @param {StepDef} step @param {StepRecord} record */
export function customerView(step, record) {
  const indicator = showIndicator(record);
  return {
    editable: Boolean(step.customerInput) && record.status !== "done",
    readOnly: !step.customerInput,
    indicator,
    status: record.status,
    progress: record.status === "done" ? 100 : clampProgress(record.progress),
    summary: record.summary
  };
}

/** @param {StepRecord} record @param {Partial<StepRecord>} patch @returns {StepRecord} */
export function applyTeamUpdate(record, patch) {
  const next = { ...record };
  if (patch.status && STATUSES.has(patch.status)) next.status = patch.status;
  if (typeof patch.summary === "string") next.summary = patch.summary.slice(0, 500);
  if (patch.progress !== undefined) next.progress = clampProgress(patch.progress);
  if (typeof patch.needsInput === "boolean") next.needsInput = patch.needsInput;
  if (next.status === "done") {
    next.needsInput = false;
    next.progress = 100;
    return next;
  }
  if (next.needsInput) next.status = "waiting_on_customer";
  else if (patch.needsInput === false && record.status === "waiting_on_customer") next.status = "in_progress";
  return next;
}

/** @returns {StepRecord[]} */
export function defaultRecords() {
  return STEPS.map((step) => {
    if (step.id === "discovery") return { id: step.id, status: "done", needsInput: false, progress: 100, summary: "Sample owners are named. Payroll, personal files, and client contracts stay excluded." };
    if (step.id === "collection") return { id: step.id, status: "waiting_on_customer", needsInput: true, progress: 40, summary: "Three approved internal files are still missing from the sample folder." };
    if (step.id === "cleaning") return { id: step.id, status: "in_progress", needsInput: false, progress: 20, summary: "Aqion is comparing versions and will keep only the current signed copy." };
    return { id: step.id, status: "not_started", needsInput: false, progress: 0, summary: step.doing };
  });
}

/** @param {StepRecord} record @returns {StepRecord} */
export function applyCustomerSave(record) {
  if (!record || record.status === "done") return record;
  const status = record.status === "not_started" || record.status === "waiting_on_customer" ? "in_progress" : record.status;
  return { ...record, needsInput: false, status };
}

export function overall(records) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const ordered = STEPS.map((step) => byId.get(step.id)).filter(Boolean);
  const done = ordered.filter((record) => record.status === "done").length;
  const percent = ordered.length ? Math.round(ordered.reduce((sum, record) => sum + (record.status === "done" ? 100 : clampProgress(record.progress)), 0) / ordered.length) : 0;
  return { done, total: STEPS.length, percent, attention: ordered.filter(showIndicator).map((record) => record.id) };
}

export function sampleAnswer(question) {
  const q = String(question || "").toLowerCase();
  if (/payroll|salary|personal|employee record/.test(q)) {
    return { text: "Payroll and personal employee records are excluded from this brain. Use the HR source system.", cite: "Exclusion recorded in step 1", refused: true };
  }
  if (/service|sell|offer|programme|program/.test(q)) {
    return { text: "Harbour Learning sells leadership programmes, sales enablement, and licensed professional training for UAE teams.", cite: "Company profile · sample", refused: false };
  }
  if (/leave|policy|handbook/.test(q)) {
    return { text: "The sample handbook is owned by HR. The indexed copy is the 2026 internal edition, not a staff draft.", cite: "Policies and handbooks · sample", refused: false };
  }
  if (/proposal|pipeline|deal/.test(q)) {
    return { text: "The sample pipeline has 12 open proposals. Four are waiting for a person to review the draft. Win rate is not calculated in this pack.", cite: "Sales workspace · sample", refused: false };
  }
  return { text: "There is no approved source for that in the sample pack. I won't guess.", cite: "No matching sample source", refused: false };
}

export function parseHash(hash) {
  const clean = String(hash || "").replace(/^#/, "").replace(/^\//, "");
  const parts = clean.split("/").filter(Boolean);
  const blank = { phase: 1, role: "customer", tab: "pm", step: "overview", dept: "" };
  if (!parts.length || parts[0] === "pm") return { ...blank, step: parts[1] || "overview" };
  if (parts[0] === "team") {
    const tab = parts[1] === "ceo" || parts[1] === "bots" ? parts[1] : "builder";
    return { phase: 1, role: "team", tab, step: tab === "builder" ? (parts[2] || "discovery") : "", dept: tab === "bots" ? (parts[2] || "sales") : "" };
  }
  if (parts[0] === "live") {
    if (parts[1] === "admin") return { phase: 2, role: "admin", tab: "admin", step: "", dept: "" };
    if (parts[1] === "dept") return { phase: 2, role: "department", tab: "department", step: "", dept: parts[2] || "sales" };
    if (parts[2] === "bots") return { phase: 2, role: "ceo", tab: "bots", step: "", dept: parts[3] || "" };
    return { phase: 2, role: "ceo", tab: "brain", step: "", dept: "" };
  }
  if (parts[0] === "ceo") return { phase: 2, role: "ceo", tab: "brain", step: "", dept: "" };
  if (parts[0] === "knowledge") return { phase: 2, role: "admin", tab: "admin", step: "", dept: "" };
  if (parts[0] === "departments") {
    const dept = parts[1] && parts[1] !== "runtime" ? parts[1] : "";
    if (!dept) return { phase: 1, role: "team", tab: "bots", step: "", dept: "sales" };
    return { phase: 2, role: "department", tab: "department", step: "", dept };
  }
  return blank;
}

export function hashFor(route) {
  if (route.phase === 1 && route.role === "customer") return route.step && route.step !== "overview" ? `#pm/${route.step}` : "#pm";
  if (route.phase === 1 && route.tab === "builder") return route.step ? `#team/builder/${route.step}` : "#team/builder/discovery";
  if (route.phase === 1 && route.tab === "ceo") return "#team/ceo";
  if (route.phase === 1 && route.tab === "bots") return `#team/bots/${route.dept || "sales"}`;
  if (route.role === "admin") return "#live/admin";
  if (route.role === "department") return `#live/dept/${route.dept || "sales"}`;
  if (route.tab === "bots") return route.dept ? `#live/ceo/bots/${route.dept}` : "#live/ceo/bots";
  return "#live/ceo";
}

export const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on customer",
  done: "Done"
};
