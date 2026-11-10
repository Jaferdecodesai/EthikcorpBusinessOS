import { buildWorkbook, excelSerialToIso, readSheetRows } from "./xlsx.mjs";

// Section 2.1 of Ethikcorp Company Brain + Department Bot Setup, 14 Oct 2026.
export const SOURCES = [
  { id: "profile", title: "Company profile & services", examples: "Website pages, service sheets, BizScan, methodology", location: "ethikcorp.com, Drive", use: "RAG", sensitivity: "Public", owner: "Marketing", notForAi: false },
  { id: "policies", title: "Policies & handbooks", examples: "HR handbook, leave, expenses, code of conduct, IT/data policy", location: "Drive / Docs", use: "RAG", sensitivity: "Internal", owner: "HR & Talent", notForAi: false },
  { id: "sops", title: "SOPs & checklists", examples: "Programme delivery SOP, venue checklist, onboarding steps", location: "Drive, ClickUp docs", use: "RAG", sensitivity: "Internal", owner: "Operations", notForAi: false },
  { id: "proposals", title: "Proposals & pitch decks", examples: "Past proposals, decks, scopes, won/lost notes", location: "Drive, email attachments", use: "RAG + FT (style)", sensitivity: "Confidential", owner: "Sales & BD", notForAi: false },
  { id: "contracts", title: "Contracts & NDAs", examples: "Signed contracts, SOWs, NDAs, clause library", location: "Drive (legal folder), email", use: "RAG (restricted)", sensitivity: "Restricted", owner: "Legal & Compliance", notForAi: false },
  { id: "crm", title: "CRM / pipeline exports", examples: "Leads, contacts, stages, deal values", location: "CRM, spreadsheets, WhatsApp Business", use: "RAG (structured lookup)", sensitivity: "Confidential (PII)", owner: "Sales & BD", notForAi: false },
  { id: "emails", title: "Emails", examples: "Client threads, decisions, approvals", location: "Gmail / Outlook", use: "RAG, selected threads only", sensitivity: "Confidential (PII)", owner: "Each department", notForAi: false },
  { id: "finance", title: "Invoices & financials", examples: "Invoices, expenses, P&L, budgets, rate cards", location: "Accounting tool, spreadsheets", use: "Structured query, not free text", sensitivity: "Restricted", owner: "Finance", notForAi: false },
  { id: "hr", title: "HR & people records", examples: "CVs, contracts, payroll, visas, appraisals", location: "HR system, Drive", use: "Neither (keep out), except anonymised role profiles", sensitivity: "Restricted (sensitive PII)", owner: "HR & Talent", notForAi: true },
  { id: "delivery", title: "Project & delivery files", examples: "TNA results, session plans, evaluation reports, ROI reports", location: "Drive, ClickUp", use: "RAG + FT (report format)", sensitivity: "Confidential", owner: "Consulting Delivery", notForAi: false },
  { id: "tasks", title: "Tasks & status", examples: "ClickUp tasks, portal tasks, status JSON", location: "ClickUp, portal", use: "RAG / live API", sensitivity: "Internal", owner: "Operations", notForAi: false },
  { id: "meetings", title: "Meeting notes & minutes", examples: "Leadership notes, client call notes, action items", location: "Docs, email, recordings", use: "RAG (after review)", sensitivity: "Confidential", owner: "Operations", notForAi: false },
  { id: "chats", title: "Chats", examples: "Internal chat, WhatsApp client chats", location: "ClickUp chat, WhatsApp", use: "Mostly neither; only decisions copied into notes", sensitivity: "Confidential (PII)", owner: "Each department", notForAi: true },
  { id: "training", title: "Training material", examples: "Slide decks, workbooks, gamified modules, trainer guides", location: "Drive, LMS", use: "RAG", sensitivity: "Internal / client IP", owner: "Consulting Delivery", notForAi: false },
  { id: "feedback", title: "Client feedback & testimonials", examples: "Surveys, testimonials, permissions", location: "Forms, email", use: "RAG (approved only)", sensitivity: "Confidential", owner: "Client Success", notForAi: false },
  { id: "aiassets", title: "AI agent assets", examples: "Call scripts, prompts, specs, test logs", location: "Repos, Drive", use: "RAG + FT (scripts)", sensitivity: "Confidential", owner: "Technology & AI", notForAi: false },
  { id: "marketing", title: "Marketing assets", examples: "Blog posts, social posts, brand guide, approved claims", location: "Website, Canva, Drive", use: "RAG + FT (voice)", sensitivity: "Public / Internal", owner: "Marketing", notForAi: false },
  { id: "legal", title: "Legal & registration", examples: "Trade licence, legal entity, TRN, insurance", location: "Drive (restricted)", use: "RAG (restricted)", sensitivity: "Restricted", owner: "Legal & Compliance", notForAi: false }
];

// Section 2.3. Steps 1 and 2 are the customer's. Steps 3 to 9 are Aqion's.
export const STEPS = [
  { n: 1, id: "discovery", name: "Discovery & inventory", customerTitle: "Map your sources and assign ownership", customerWork: true, summary: "Each department head lists the 18 sources, names an owner, and marks each source authoritative or context-only. Drafts and outdated material are marked not for AI." },
  { n: 2, id: "collection", name: "Collection", customerTitle: "Send the approved files", customerWork: true, summary: "Send each approved source to the GitHub repository or the Google Drive folder. Read-only connectors for Drive, mail and ClickUp come after this handoff." },
  { n: 3, id: "cleaning", name: "Cleaning & dedupe", customerTitle: "Cleaning & dedupe", customerWork: false, summary: "Aqion keeps the latest signed version, removes duplicates, turns scans into text, and drops email signatures and quoted replies." },
  { n: 4, id: "privacy", name: "PII handling (UAE PDPL)", customerTitle: "PII handling", customerWork: false, summary: "Aqion redacts personal identifiers that are not needed, keeps HR and payroll out, and records what is indexed and why. Counsel still has to confirm the Executive Regulations and transfer rules." },
  { n: 5, id: "chunking", name: "Chunking & metadata", customerTitle: "Chunking & metadata", customerWork: false, summary: "Aqion splits documents on their headings and tags each passage with its source, owner, department, type, date, sensitivity, version and hash." },
  { n: 6, id: "embeddings", name: "Embeddings + vector DB", customerTitle: "Embeddings + vector DB", customerWork: false, summary: "Aqion turns each passage into an embedding for hybrid search. UAE-region hosting is the preference for client data and is not configured." },
  { n: 7, id: "access", name: "Role-based access", customerTitle: "Role-based access", customerWork: false, summary: "Aqion maps portal roles to the sensitivity tiers inside search, not only on the screen." },
  { n: 8, id: "evaluation", name: "Evaluation", customerTitle: "Evaluation", customerWork: false, summary: "Aqion prepares a golden set and checks citations, refusals, conflicting versions and permission leaks. The target is zero leaks. No result is claimed yet." },
  { n: 9, id: "refresh", name: "Refresh cadence", customerTitle: "Refresh cadence", customerWork: false, summary: "Fast-moving sources are due daily and stable ones weekly. Deletions are removed the same day. This is the operating rule, not a live scheduler." }
];

const HEADERS = ["Source id", "Data source", "Owning department", "Owner name", "Due date", "Authoritative or context-only", "Not for AI", "Notes"];

export function ownershipTemplate() {
  return SOURCES.map((source) => ({
    sourceId: source.id,
    title: source.title,
    department: source.owner,
    ownerName: "",
    dueDate: "",
    authority: "",
    notForAi: source.notForAi,
    notes: `${source.examples}. Usually in ${source.location}. Use: ${source.use}. Sensitivity: ${source.sensitivity}.`
  }));
}

export async function workbookFor(rows) {
  return buildWorkbook(rows.map((row) => ({
    "Source id": row.sourceId,
    "Data source": row.title,
    "Owning department": row.department,
    "Owner name": row.ownerName || "",
    "Due date": typeof row.dueDate === "number" ? row.dueDate : (row.dueDate || ""),
    "Authoritative or context-only": row.authority || "",
    "Not for AI": typeof row.notForAi === "string" ? row.notForAi : (row.notForAi ? "Yes" : "No"),
    "Notes": row.notes || ""
  })));
}

export async function parseWorkbook(bytes) {
  try {
    const table = await readSheetRows(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    if (!table.length) return { ok: false, error: "The workbook has no rows." };
    const header = table[0].map((cell) => String(cell).trim().toLowerCase());
    const index = Object.fromEntries(HEADERS.map((name) => [name, header.indexOf(name.toLowerCase())]));
    const missing = HEADERS.filter((name) => index[name] < 0);
    if (missing.length) return { ok: false, error: `Missing columns: ${missing.join(", ")}.` };
    const rows = [];
    table.slice(1).forEach((cells, offset) => {
      const sourceId = String(cells[index["Source id"]] || "").trim();
      if (!sourceId) return;
      const dueRaw = cells[index["Due date"]];
      const dueDate = /^\d+(\.\d+)?$/.test(String(dueRaw).trim()) ? excelSerialToIso(dueRaw) : String(dueRaw || "").trim();
      rows.push({
        row: offset + 2,
        sourceId,
        title: String(cells[index["Data source"]] || "").trim(),
        department: String(cells[index["Owning department"]] || "").trim(),
        ownerName: String(cells[index["Owner name"]] || "").trim(),
        dueDate,
        authority: String(cells[index["Authoritative or context-only"]] || "").trim(),
        notForAi: String(cells[index["Not for AI"]] || "").trim(),
        notes: String(cells[index.Notes] || "").trim()
      });
    });
    return { ok: true, rows };
  } catch {
    return { ok: false, error: "This is not a readable .xlsx workbook." };
  }
}

export function validateOwnership(parsed) {
  if (!parsed?.ok) return { ok: false, errors: [{ row: 0, sourceId: "", message: parsed?.error || "This is not a readable .xlsx workbook." }] };
  const errors = [];
  const seen = new Map();
  for (const row of parsed.rows) {
    const source = SOURCES.find((item) => item.id === row.sourceId);
    if (!source) {
      errors.push({ row: row.row, sourceId: row.sourceId, message: `Row ${row.row}: source id "${row.sourceId}" is not one of the 18 sources.` });
      continue;
    }
    if (seen.has(row.sourceId)) errors.push({ row: row.row, sourceId: row.sourceId, message: `Source id "${row.sourceId}" appears more than once.` });
    seen.set(row.sourceId, row.row);
    if (!row.department) errors.push({ row: row.row, sourceId: row.sourceId, message: `Row ${row.row}: owning department is empty.` });
    if (!row.ownerName) errors.push({ row: row.row, sourceId: row.sourceId, message: `Row ${row.row}: owner name is empty.` });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dueDate) || Number.isNaN(Date.parse(`${row.dueDate}T00:00:00Z`))) errors.push({ row: row.row, sourceId: row.sourceId, message: `Row ${row.row}: due date must be YYYY-MM-DD.` });
    const authority = row.authority.toLowerCase().replace(/\s+/g, " ");
    if (authority !== "authoritative" && authority !== "context-only" && authority !== "context only") errors.push({ row: row.row, sourceId: row.sourceId, message: `Row ${row.row}: mark the source Authoritative or context-only.` });
    const flag = row.notForAi.toLowerCase();
    if (!["yes", "no", "true", "false"].includes(flag)) errors.push({ row: row.row, sourceId: row.sourceId, message: `Row ${row.row}: Not for AI must be Yes or No.` });
  }
  for (const source of SOURCES) {
    if (!seen.has(source.id)) errors.push({ row: 0, sourceId: source.id, message: `${source.title} was not in the file.` });
  }
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    rows: parsed.rows.map((row) => ({
      sourceId: row.sourceId,
      department: row.department,
      ownerName: row.ownerName,
      dueDate: row.dueDate,
      authority: /^authoritative$/i.test(row.authority) ? "Authoritative" : "Context-only",
      notForAi: ["yes", "true"].includes(row.notForAi.toLowerCase()),
      notes: row.notes
    }))
  };
}

export function submitSource(input) {
  const sourceId = String(input?.sourceId || "").trim();
  if (!SOURCES.some((source) => source.id === sourceId)) return { ok: false, error: "Unknown source." };
  const target = String(input?.target || "");
  if (!["github", "drive", "not_applicable"].includes(target)) return { ok: false, error: "Choose GitHub, Google Drive, or not applicable." };
  return { ok: true, row: { sourceId, target, note: String(input?.note || "").slice(0, 2000) } };
}

export function needsYou(step) {
  return Boolean(step?.needsInput) && step.status !== "done";
}

export function defaultSteps() {
  return STEPS.map((step) => ({
    id: step.id,
    status: step.id === "discovery" ? "waiting_on_customer" : "not_started",
    needsInput: step.id === "discovery",
    summary: step.summary,
    progress: 0
  }));
}
