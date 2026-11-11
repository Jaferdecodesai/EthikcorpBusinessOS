import departments from "../shared/departments.json" with { type: "json" };

export const PIPELINE = ["ownership", "intake", "parse", "clean", "chunk", "embed", "index", "rag"];
export const DEV_STAGES = ["collection", "cleaning", "parsing", "chunking", "embedding", "vectors", "rag", "finetune", "evaluation", "connectors"];

const DIMS = 48;

export function tokenize(text) {
  return String(text || "").toLowerCase().match(/[a-z0-9]{2,}/g) || [];
}

export function embed(text) {
  const vector = new Array(DIMS).fill(0);
  for (const token of tokenize(text)) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) hash = Math.imul(hash ^ token.charCodeAt(i), 16777619);
    vector[Math.abs(hash) % DIMS] += (hash & 1) ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

export function cosine(left, right) {
  return left.reduce((sum, value, index) => sum + value * (right[index] || 0), 0);
}

export function cleanText(text) {
  return String(text || "").replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function parseDocument(name, text) {
  const filename = String(name || "").toLowerCase();
  if (/\.(pdf|docx|pptx|xlsx|png|jpe?g)$/.test(filename)) {
    return { ok: false, error: "This prototype accepts UTF-8 text and Markdown. PDF, Office, and image parsing needs Docling or Unstructured, which are not running in this Worker." };
  }
  const cleaned = cleanText(text);
  if (!cleaned) return { ok: false, error: "The document has no text." };
  if (cleaned.length > 40000) return { ok: false, error: "The document is larger than 40,000 characters. Split it before upload." };
  return { ok: true, text: cleaned };
}

export function chunkMarkdown(name, text) {
  const parts = String(text || "").split(/^(?=#{1,6} )/m).map((part) => part.trim()).filter(Boolean);
  return (parts.length ? parts : [String(text || "")]).flatMap((part) => {
    const heading = (part.match(/^#{1,6} +(.+)$/m) || [, "Document"])[1].trim();
    const anchor = heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return chunkText(part).map((body) => ({ text: body, heading, anchor, source: name }));
  }).slice(0, 80);
}

export function chunkText(text) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const block of blocks.length ? blocks : [text]) {
    if ((current + "\n\n" + block).length > 700 && current) {
      chunks.push(current);
      current = block;
    } else current = current ? `${current}\n\n${block}` : block;
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 40);
}

export function rankChunks(question, chunks) {
  const query = embed(question);
  return chunks.map((chunk) => ({ ...chunk, score: cosine(query, chunk.embedding) })).sort((a, b) => b.score - a.score);
}

export function answerFromChunks(question, chunks) {
  const ranked = rankChunks(question, chunks).filter((chunk) => chunk.score > 0.08).slice(0, 3);
  if (!ranked.length) {
    return { answer: "No indexed passage matches that question. I will not guess.", citations: [], llm: "not_configured", retrieval: "prototype-hashing" };
  }
  return {
    answer: ranked[0].text,
    citations: ranked.map((chunk) => ({ document: chunk.document, heading: chunk.heading || "", anchor: chunk.anchor || "", excerpt: chunk.text.slice(0, 280), score: Math.round(chunk.score * 1000) / 1000 })),
    llm: "not_configured",
    retrieval: "prototype-hashing",
    note: "The cited passage is returned directly. No base model is connected on this Worker."
  };
}

export function emptyBrain() {
  return { documents: [], chunks: [], ownershipReady: false, confirmed: {}, roles: {} };
}

export function ingestDocument(brain, input) {
  const parsed = parseDocument(input.name, input.text);
  if (!parsed.ok) return { ok: false, error: parsed.error, brain };
  const id = `doc-${brain.documents.length + 1}-${Date.now()}`;
  const rich = String(input.name || "").endsWith(".md") ? chunkMarkdown(input.name, parsed.text) : chunkText(parsed.text).map((body) => ({ text: body, heading: "", anchor: "", source: input.name }));
  const pieces = rich.map((piece, index) => ({ id: `${id}-${index}`, documentId: id, document: input.name, heading: piece.heading, anchor: piece.anchor, source: piece.source, text: piece.text, embedding: embed(piece.text) }));
  const next = { ...brain, documents: [...brain.documents, { id, name: input.name, sourceId: input.sourceId || "", text: parsed.text }], chunks: [...brain.chunks, ...pieces] };
  const check = answerFromChunks(tokenize(parsed.text).slice(0, 6).join(" "), next.chunks);
  return { ok: true, brain: next, citationReady: check.citations.length > 0 };
}

export function stageReport(brain) {
  const documents = brain.documents || [];
  const chunks = brain.chunks || [];
  const hasDoc = documents.length > 0;
  const hasChunk = chunks.length > 0;
  const rag = hasChunk && answerFromChunks(tokenize(documents[0]?.text || "").slice(0, 6).join(" "), chunks).citations.length > 0;
  const sha = String(brain.quality?.sha || brain.demo?.sha || "").slice(0, 12);
  const shaNote = sha ? ` Commit ${sha}.` : "";
  const tables = Object.entries(brain.datasets || {}).filter(([name]) => name !== "consistency");
  const rowNote = tables.length ? ` Rows: ${tables.map(([name, table]) => `${name} ${table.rows?.length || 0}`).join(", ")}.` : "";
  const demoReady = Boolean(brain.demoReady);
  const ownershipDone = Boolean(brain.ownershipReady || demoReady);
  const stages = {
    ownership: { status: ownershipDone ? "done" : "not_started", detail: brain.ownershipReady ? "18-source ownership workbook imported." : demoReady ? `Demo corpus ingested.${shaNote} The ownership workbook does not block this sample.` : "18-source ownership workbook. It does not block the demo ingest." },
    intake: { status: hasDoc ? "done" : "not_started", detail: hasDoc ? `${documents.length} documents received.${shaNote}` : "No documents received." },
    parse: { status: hasDoc ? "done" : "not_started", detail: hasDoc ? `${documents.length} UTF-8 documents parsed.${rowNote}` : "Plain text and Markdown only." },
    clean: { status: hasDoc ? "done" : "not_started", detail: hasDoc ? `${documents.length} documents cleaned of blank lines and null bytes.` : "Whitespace and blank lines." },
    chunk: { status: hasChunk ? "done" : "not_started", detail: hasChunk ? `${chunks.length} passages, each with a source path and heading.` : "No passages yet." },
    embed: { status: hasChunk ? "done" : "not_started", detail: hasChunk ? `${chunks.length} prototype vectors, ${DIMS} dimensions. Not a neural embedding model.` : "No vectors yet." },
    index: { status: hasChunk ? "done" : "not_started", detail: hasChunk ? `${chunks.length} vectors indexed.${shaNote}` : "Vectors are stored in this Worker's Durable Object SQLite." },
    rag: { status: rag ? "done" : "not_started", detail: rag ? `Citations resolve to ${chunks.length} passages. No base LLM is connected.` : "Retrieval has not returned a citation yet." }
  };
  const done = PIPELINE.filter((id) => stages[id].status === "done").length;
  return { stages, percent: Math.round((done / PIPELINE.length) * 100), brainReady: done === PIPELINE.length };
}

export function departmentGate(confirmed) {
  return departments.map((department) => ({
    id: department.id,
    name: department.name,
    workflows: department.workflows.map((workflow) => workflow.name),
    confirmed: Boolean(confirmed[department.id])
  }));
}

export function portalAccess(role, brain) {
  const report = stageReport(brain);
  const departments = departmentGate(brain.confirmed || {});
  const botsReady = departments.every((department) => department.confirmed);
  const dev = role === "dev";
  const tabs = [
    { id: "pm", label: "BusinessBrain Builder", enabled: true },
    { id: "brain", label: "Ethikcorp BusinessBrain", enabled: dev || report.brainReady },
    { id: "bots", label: "Ethikcorp Businessbots", enabled: dev || botsReady }
  ];
  const order = !dev && report.brainReady && botsReady ? ["brain", "bots", "pm"] : ["pm", "brain", "bots"];
  return { role: dev ? "dev" : "customer", percent: report.percent, brainReady: report.brainReady, botsReady, tabs: order.map((id) => tabs.find((tab) => tab.id === id)), departments, stages: report.stages };
}

export function connectorStatus({ github = false, drive = false } = {}) {
  return {
    github: github ? { ok: true, mode: "token_present" } : { ok: false, missing: ["GITHUB_TOKEN"], purpose: "Read file contents from the customer's private GitHub repository. Not configured on this Worker." },
    drive: drive ? { ok: true, mode: "oauth_present" } : { ok: false, missing: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"], purpose: "OAuth consent to read the approved Google Drive folder. Not configured on this Worker." }
  };
}

export function residency() {
  return {
    prototype: "This Cloudflare Worker and its Durable Object SQLite run on Cloudflare's global network, not in a UAE data centre.",
    embedding: "Vectors are prototype hashes computed inside the Worker. Workers AI and Vectorize are not bound.",
    llm: "No base model is called. Answers are cited passages.",
    production: "Production needs UAE-hosted object storage, a UAE inference endpoint, and a UAE vector database. Fine-tuning (LoRA via Unsloth or Axolotl) stays outside the Worker as a queued job."
  };
}
