export type Stage = {
  id: string;
  name: string;
  short: string;
  summary: string;
  client: string[];
  tasks: { id: string; label: string; evidence: string }[];
  gate: string;
};

export type Source = {
  id: string;
  title: string;
  examples: string;
  usualLocation: string;
  intendedUse: string;
  sensitivity: string;
  owner: string;
  find: string;
  prepare: string;
};

export const stages: Stage[] = [
  {
    id: "discovery", name: "Discovery & inventory", short: "Map the sources",
    summary: "Identify the systems and records that may become the company brain. Separate authoritative material from context, drafts and expired versions.",
    client: ["Each department head lists sources and a current owner.", "Name the system of record, source URL or folder, audience and refresh frequency.", "Mark drafts, duplicates and superseded material as excluded."],
    tasks: [
      { id: "discover-owners", label: "Assign source owners (18 categories)", evidence: "Sponsor and named source-owner roster" },
      { id: "discover-register", label: "Complete the 18-category source inventory", evidence: "Source register with locations and status" },
      { id: "discover-authority", label: "Mark authoritative, context-only and excluded records", evidence: "Owner-approved inclusion decision" },
      { id: "discover-boundaries", label: "Record client, engagement and department boundaries", evidence: "Draft access matrix" }
    ],
    gate: "A client owner approves the source register before collection."
  },
  {
    id: "collection", name: "Collection", short: "Receive approved files",
    summary: "Collect only the approved subset through a scoped read-only export or a private repository upload. Preserve provenance and receipt details.",
    client: ["Provide a private GitHub repository for approved small source files.", "Supply source IDs, owner, version and original location for each item.", "Use the intake form below; confidential and restricted data stays out of the GitHub upload in this pilot."],
    tasks: [
      { id: "collect-repo", label: "Connect and verify a private GitHub repository", evidence: "Private-repo connection receipt" },
      { id: "collect-scope", label: "Approve per-source collection scope and rights", evidence: "Signed source register" },
      { id: "collect-transfer", label: "Upload approved Public/Internal files and record remaining source locations", evidence: "File path or source locator" },
      { id: "collect-reconcile", label: "Reconcile received items against the source register", evidence: "Manifest and missing-item report" }
    ],
    gate: "Every received item has an owner, classification, source location and approved scope."
  },
  {
    id: "cleaning", name: "Cleaning & dedupe", short: "Keep the right version",
    summary: "Remove duplicates and obsolete copies, review extracted text, and prepare readable Markdown for GBrain's company import.",
    client: ["Identify the current signed or approved version.", "Resolve conflicting versions and unreadable scans.", "Review converted tables, slides and PDFs before they enter the curated corpus."],
    tasks: [
      { id: "clean-version", label: "Confirm current versions and supersession links", evidence: "Version register" },
      { id: "clean-duplicate", label: "Review duplicate and near-duplicate candidates", evidence: "Dedupe decisions" },
      { id: "clean-extract", label: "Review OCR and document-to-Markdown conversions", evidence: "Approved extraction sample" },
      { id: "clean-commit", label: "Approve curated Markdown commit", evidence: "Commit SHA and owner sign-off" }
    ],
    gate: "Only reviewed, committed Markdown moves to the GBrain import preview."
  },
  {
    id: "privacy", name: "PII handling", short: "Apply data boundaries",
    summary: "Check whether personal or client information is needed for the pilot and apply approved minimisation, redaction, retention and access decisions.",
    client: ["Name the privacy/security reviewer and lawful processing basis.", "Confirm exclusions, especially HR, payroll and unrestricted chat history.", "Approve redaction and retention rules for selected client material."],
    tasks: [
      { id: "privacy-reviewer", label: "Assign privacy and security reviewers", evidence: "Reviewer roster" },
      { id: "privacy-purpose", label: "Record processing purpose and permitted categories", evidence: "Processing review" },
      { id: "privacy-redact", label: "Approve redaction and exclusion decisions", evidence: "Redaction policy" },
      { id: "privacy-retention", label: "Define retention, deletion and backup handling", evidence: "Retention schedule" }
    ],
    gate: "A named client reviewer approves the data boundary; the PM cannot approve it."
  },
  {
    id: "chunking", name: "Chunking & metadata", short: "Make sources traceable",
    summary: "Split approved documents at meaningful headings and attach the metadata needed for citations, freshness and deletion.",
    client: ["Validate section headings and table meaning.", "Confirm source owner, department, effective date, sensitivity and version.", "Review a sample of chunks and their links back to originals."],
    tasks: [
      { id: "chunk-schema", label: "Approve metadata schema and canonical IDs", evidence: "Schema approval" },
      { id: "chunk-sample", label: "Review chunk and citation samples", evidence: "Sample review record" },
      { id: "chunk-coverage", label: "Check every included file has provenance", evidence: "Coverage report" },
      { id: "chunk-delete", label: "Test source withdrawal mapping", evidence: "Delete/reindex receipt" }
    ],
    gate: "Each chunk can be traced to an approved source and version."
  },
  {
    id: "embeddings", name: "Embeddings & vectors", short: "Build search index",
    summary: "Create an embedding for approved chunks and store it in a searchable index. GitHub holds curated source files; GBrain uses a local index for this small trial. A UAE PostgreSQL/pgvector route is the production candidate.",
    client: ["Approve the exact embedding and reranking provider and processing location.", "Provide a small English/Arabic search sample.", "Choose whether a future UAE database is required."],
    tasks: [
      { id: "embed-route", label: "Approve an embedding route with no unapproved egress", evidence: "Model/data-flow sign-off" },
      { id: "embed-index", label: "Run GBrain import preview and index approved commit", evidence: "Import receipt and index manifest" },
      { id: "embed-sample", label: "Inspect search results on sample questions", evidence: "Retrieval review" },
      { id: "embed-rebuild", label: "Verify index rebuild after source change", evidence: "Reindex receipt" }
    ],
    gate: "No indexing is marked complete from a GitHub upload alone."
  },
  {
    id: "access", name: "Role-based access", short: "Prove the denials",
    summary: "Enforce identity and source permissions before retrieved text reaches a model. Test department and engagement boundaries with both allowed and denied users.",
    client: ["Supply named test roles and an access matrix.", "Approve which source collections each role may query.", "Review denied-access cases, including CEO and bot accounts."],
    tasks: [
      { id: "access-matrix", label: "Approve role, department and engagement matrix", evidence: "Signed access matrix" },
      { id: "access-identity", label: "Verify authenticated test identities", evidence: "Identity test receipt" },
      { id: "access-negative", label: "Run cross-role and cross-engagement denial cases", evidence: "Negative-access results" },
      { id: "access-revoke", label: "Test source revocation and reindex", evidence: "Revocation receipt" }
    ],
    gate: "Zero observed leaks in the agreed test set, with client security sign-off."
  },
  {
    id: "evaluation", name: "Evaluation", short: "Measure answer quality",
    summary: "Use a client-approved question set to evaluate retrieval, citations, abstention and unsafe instructions before any employee pilot.",
    client: ["Provide representative questions and expected sources.", "Include current versus old facts, unsupported questions and bilingual cases where relevant.", "Name reviewers and agree thresholds before seeing results."],
    tasks: [
      { id: "eval-set", label: "Approve golden questions, expected evidence and nonanswers", evidence: "Versioned evaluation set" },
      { id: "eval-threshold", label: "Set answer, citation and abstention release thresholds", evidence: "Signed rubric" },
      { id: "eval-run", label: "Run repeatable answer and access evaluation", evidence: "Versioned result report" },
      { id: "eval-review", label: "Review failures and approve read-only pilot gate", evidence: "Reviewer decision" }
    ],
    gate: "Client reviewers accept the measured result; no threshold is invented by the app."
  },
  {
    id: "refresh", name: "Refresh cadence", short: "Keep it current",
    summary: "Keep source versions, index entries and access grants aligned as documents change or are withdrawn.",
    client: ["Set an owner and change frequency for each source.", "Define retirement, correction and deletion triggers.", "Review refresh failures and periodic quality reports."],
    tasks: [
      { id: "refresh-cadence", label: "Approve refresh frequency per source", evidence: "Source schedule" },
      { id: "refresh-change", label: "Test changed and withdrawn document handling", evidence: "Change/revocation receipt" },
      { id: "refresh-owner", label: "Assign stale-source and incident owners", evidence: "Operations roster" },
      { id: "refresh-handoff", label: "Approve operating handoff and next iteration", evidence: "Pilot handoff note" }
    ],
    gate: "A human owner can correct, withdraw and verify every indexed source."
  }
];

// Source categories and the first six fields come from the reference PDF, pages 4-5.
// Locate/prepare guidance is Superbrain PM's proposed client instruction, not a PDF quotation.
export const sources: Source[] = [
  { id:"profile", title:"Company profile & services", examples:"Website pages, service sheets, BizScan, methodology", usualLocation:"ethikcorp.com, Drive", intendedUse:"RAG", sensitivity:"Public", owner:"Marketing", find:"Open the current website and Marketing Drive folder; copy the canonical page URLs and final service sheets.", prepare:"Upload approved Markdown/text export or record the public URL. Mark the effective version." },
  { id:"policies", title:"Policies & handbooks", examples:"HR handbook, leave, expenses, code of conduct, IT/data policy", usualLocation:"Drive / Docs", intendedUse:"RAG", sensitivity:"Internal", owner:"HR & Talent", find:"Ask the policy owner for the current published folder or Docs links, not staff copies.", prepare:"Export approved pages to Markdown or PDF; remove superseded versions before upload." },
  { id:"sops", title:"SOPs & checklists", examples:"Programme delivery SOP, venue checklist, onboarding steps", usualLocation:"Drive, ClickUp docs", intendedUse:"RAG", sensitivity:"Internal", owner:"Operations", find:"Open the Operations shared drive and ClickUp Docs; identify the active process owner.", prepare:"Export current checklists with headings and version dates; upload only the approved set." },
  { id:"proposals", title:"Proposals & pitch decks", examples:"Past proposals, decks, scopes, won/lost notes", usualLocation:"Drive, email attachments", intendedUse:"RAG + optional FT (style)", sensitivity:"Confidential", owner:"Sales & BD", find:"Ask Sales for the approved proposal library and final sent versions.", prepare:"Record location and owner only in this pilot. Redact client details and obtain rights review before a separate controlled transfer." },
  { id:"contracts", title:"Contracts & NDAs", examples:"Signed contracts, SOWs, NDAs, clause library", usualLocation:"Drive legal folder, email", intendedUse:"Restricted RAG", sensitivity:"Restricted", owner:"Legal & Compliance", find:"Legal identifies the signed repository and clause owner.", prepare:"Metadata only here. Do not upload contract bytes to the GitHub pilot corpus." },
  { id:"crm", title:"CRM / pipeline exports", examples:"Leads, contacts, stages, deal values", usualLocation:"CRM, spreadsheets, WhatsApp Business", intendedUse:"Structured lookup", sensitivity:"Confidential (PII)", owner:"Sales & BD", find:"Ask the CRM administrator for object names, field dictionary and read-only scope.", prepare:"Record system and approved fields. Keep contact/PII exports out of the GitHub pilot corpus." },
  { id:"emails", title:"Emails", examples:"Client threads, decisions, approvals", usualLocation:"Gmail / Outlook", intendedUse:"Selected-thread RAG", sensitivity:"Confidential (PII)", owner:"Each department", find:"Owners identify specific decision threads by subject/date rather than giving mailbox access.", prepare:"Record approved thread list and decision summary; review participants and redaction before any transfer." },
  { id:"finance", title:"Invoices & financials", examples:"Invoices, expenses, P&L, budgets, rate cards", usualLocation:"Accounting tool, spreadsheets", intendedUse:"Structured query, not free text", sensitivity:"Restricted", owner:"Finance", find:"Finance names the accounting system and authorized report owner.", prepare:"Metadata only. Keep financial records out of the GitHub pilot corpus." },
  { id:"hr", title:"HR & people records", examples:"CVs, contracts, payroll, visas, appraisals", usualLocation:"HR system, Drive", intendedUse:"Excluded except approved anonymous role profiles", sensitivity:"Restricted (sensitive PII)", owner:"HR & Talent", find:"HR confirms the protected system and whether any anonymous role profile is useful.", prepare:"Do not upload personal HR records. Record exclusion and any separately approved anonymous profile." },
  { id:"delivery", title:"Project & delivery files", examples:"TNA results, session plans, evaluation reports, ROI reports", usualLocation:"Drive, ClickUp", intendedUse:"RAG + optional FT (format)", sensitivity:"Confidential", owner:"Consulting Delivery", find:"Project lead identifies final client-approved delivery folders.", prepare:"Record location and client rights. Use redacted exemplars only after owner review." },
  { id:"tasks", title:"Tasks & status", examples:"ClickUp tasks, portal tasks, status JSON", usualLocation:"ClickUp, portal", intendedUse:"RAG / live API", sensitivity:"Internal", owner:"Operations", find:"Ask the ClickUp/portal admin for list IDs, statuses and an export of non-client-sensitive tasks.", prepare:"Upload a reviewed status schema or small approved export; live state should later use a read-only API." },
  { id:"meetings", title:"Meeting notes & minutes", examples:"Leadership notes, client call notes, action items", usualLocation:"Docs, email, recordings", intendedUse:"RAG after review", sensitivity:"Confidential", owner:"Operations", find:"Locate signed minutes or the meeting owner's final decision log.", prepare:"Record location; extract only approved decisions after participant and sensitivity review." },
  { id:"chats", title:"Chats", examples:"Internal chat, WhatsApp client chats", usualLocation:"ClickUp chat, WhatsApp", intendedUse:"Usually excluded; curated decisions only", sensitivity:"Confidential (PII)", owner:"Each department", find:"Ask owners for already-approved decision summaries, not full chat exports.", prepare:"Do not bulk upload chat history. Record exclusion or curated decision note." },
  { id:"training", title:"Training material", examples:"Slide decks, workbooks, gamified modules, trainer guides", usualLocation:"Drive, LMS", intendedUse:"RAG", sensitivity:"Internal / client IP", owner:"Consulting Delivery", find:"Locate the final LMS course or trainer master folder and rights holder.", prepare:"Upload only company-owned internal material; mark client IP for review and keep it out until approved." },
  { id:"feedback", title:"Client feedback & testimonials", examples:"Surveys, testimonials, permissions", usualLocation:"Forms, email", intendedUse:"Approved-only RAG", sensitivity:"Confidential", owner:"Client Success", find:"Client Success finds the approved testimonial register and permission records.", prepare:"Record location and consent/usage status. Upload only explicitly approved public quotes." },
  { id:"aiassets", title:"AI agent assets", examples:"Call scripts, prompts, specs, test logs", usualLocation:"Repos, Drive", intendedUse:"RAG + optional FT (scripts)", sensitivity:"Confidential", owner:"Technology & AI", find:"Find the versioned repo or approved scripts folder; distinguish draft from released.", prepare:"Record repo path and release tag. Upload only sanitized, approved guidance." },
  { id:"marketing", title:"Marketing assets", examples:"Blog posts, social posts, brand guide, approved claims", usualLocation:"Website, Canva, Drive", intendedUse:"RAG + optional FT (voice)", sensitivity:"Public / Internal", owner:"Marketing", find:"Find the brand source folder and published asset URLs; ask for claim expiry dates.", prepare:"Upload final brand guide and approved public copy as Markdown/text; keep draft claims excluded." },
  { id:"legal", title:"Legal & registration", examples:"Trade licence, legal entity, TRN, insurance", usualLocation:"Drive restricted folder", intendedUse:"Restricted RAG", sensitivity:"Restricted", owner:"Legal & Compliance", find:"Legal identifies the canonical corporate records folder and current validity dates.", prepare:"Metadata only in this GitHub pilot. Do not upload legal records." }
];
