import { parseCsv } from "./csv.mjs";
import { ingestDocument } from "./brain-pipeline.mjs";
import { KPI_TARGETS_CSV, KPI_TARGETS_PATH } from "./kpi-targets.mjs";
import { crossCheck, validateTable } from "./quality.mjs";
import { QUESTIONS, buildSemanticLayer, instructionRecords } from "./semantic.mjs";
import { WORKFLOW_FILES, parseWorkflow, proposeAutomations } from "./workflows.mjs";

export const DEMO_GITHUB = "https://github.com/Jaferdecodesai/ethikcorp-businessos-demo-data";
export const DEMO_RAW = "https://raw.githubusercontent.com/Jaferdecodesai/ethikcorp-businessos-demo-data/main/";
export const DEMO_DRIVE = "https://drive.google.com/drive/folders/1sjU5DFEFRSwi1WcJFDz9tPRFwPHouut4";
const TREE = "https://api.github.com/repos/Jaferdecodesai/ethikcorp-businessos-demo-data/git/trees/main?recursive=1";
const COMMIT = "https://api.github.com/repos/Jaferdecodesai/ethikcorp-businessos-demo-data/commits/main";

const DATASETS = {
  "sample-data/monthly-revenue-by-service-line.csv": "revenue",
  "sample-data/sales-pipeline.csv": "pipeline",
  "sample-data/clients.csv": "clients",
  "sample-data/department-headcount-and-hours.csv": "hours",
  [KPI_TARGETS_PATH]: "targets"
};

export function fileDisposition(path) {
  if (path === KPI_TARGETS_PATH || path.endsWith(".md") || path.endsWith(".csv") || path.endsWith("_consistency-check.json")) return { action: "ingest", reason: "" };
  if (path === "drive-manifest.json") return { action: "skip", reason: "Drive id manifest. The knowledge files it lists are ingested separately." };
  if (path === "public-kb/index.json") return { action: "skip", reason: "Page index. Each Markdown page is ingested on its own." };
  if (path.endsWith(".json")) return { action: "skip", reason: "JSON catalogue, not a knowledge document." };
  return { action: "skip", reason: "Not a Markdown, CSV, or consistency file." };
}

export function wantedPath(path) {
  return true;
}

export async function demoPlan(fetchImpl = fetch) {
  const manifestResponse = await fetchImpl(`${DEMO_RAW}drive-manifest.json`);
  const manifest = manifestResponse.ok ? await manifestResponse.json() : { files: [] };
  const drive = await probeDrive(fetchImpl, manifest);
  const headers = { accept: "application/vnd.github+json", "user-agent": "ethikcorp-businessos-review" };
  const commitResponse = await fetchImpl(COMMIT, { headers });
  const commit = commitResponse.ok ? await commitResponse.json() : {};
  const treeResponse = await fetchImpl(TREE, { headers });
  if (!treeResponse.ok) throw new Error("The public GitHub demo repository could not be listed.");
  const tree = await treeResponse.json();
  const files = (tree.tree || []).filter((item) => item.type === "blob").map((item) => ({ path: item.path, size: item.size, sha: item.sha, ...fileDisposition(item.path) }));
  if (!files.some((item) => item.path === KPI_TARGETS_PATH)) files.push({ path: KPI_TARGETS_PATH, size: KPI_TARGETS_CSV.length, sha: "local-fixture", local: true, ...fileDisposition(KPI_TARGETS_PATH) });
  for (const listed of manifest.files || []) {
    if (!files.some((item) => item.path === listed.path)) files.push({ path: listed.path, size: 0, sha: "", missing: true, action: "failed", reason: "Listed in drive-manifest.json but absent from the GitHub tree." });
  }
  const driveIndex = Object.fromEntries((manifest.files || []).map((file) => [file.path, file.drive_id]));
  return { github: DEMO_GITHUB, raw: DEMO_RAW, driveUrl: DEMO_DRIVE, drive, files, sha: commit.sha || "", driveIndex };
}

export async function probeDrive(fetchImpl, manifest) {
  const file = (manifest.files || []).find((item) => item.path === "sample-data/clients.csv") || (manifest.files || [])[0];
  if (!file?.download_url) return { status: "pending", detail: "Drive access pending" };
  try {
    const response = await fetchImpl(file.download_url, { redirect: "manual" });
    const location = response.headers?.get?.("location") || "";
    if (response.status >= 300 && response.status < 400) return { status: "pending", detail: "Drive access pending" };
    if (!response.ok) return { status: "pending", detail: "Drive access pending" };
    const text = await response.text();
    if (/accounts\.google\.com|Sign in|ServiceLogin/i.test(text.slice(0, 800))) return { status: "pending", detail: "Drive access pending" };
    return { status: "ok", detail: "Drive file downloaded." };
  } catch { return { status: "pending", detail: "Drive access pending" }; }
}

export async function buildFromDemo(brain, fetchImpl = fetch) {
  const plan = await demoPlan(fetchImpl);
  let next = { ...brain, demo: { ...(brain.demo || {}), github: plan.github, driveUrl: plan.driveUrl, drive: plan.drive, sha: plan.sha, driveIndex: plan.driveIndex, filesTotal: plan.files.length, filesDone: 0, log: brain.demo?.log || [] } };
  for (const file of plan.files) {
    try {
      const result = await ingestDemoFile(next, file.path, fetchImpl);
      next = result.brain || next;
    } catch { /* one bad file does not undo Step 1 */ }
  }
  return next;
}

export async function ingestDemoFile(brain, filePath, fetchImpl = fetch) {
  const disposition = fileDisposition(filePath);
  const fetchedAt = new Date().toISOString();
  if (disposition.action === "skip") {
    return remember(brain, { path: filePath, status: "skipped", reason: disposition.reason, source: "github", rows: 0, passages: 0, pass: true, fetchedAt });
  }
  const response = await fetchImpl(`${DEMO_RAW}${filePath}`);
  const localTargets = filePath === KPI_TARGETS_PATH ? KPI_TARGETS_CSV : "";
  if (!response.ok && !localTargets) return remember(brain, { path: filePath, status: "failed", reason: `${filePath} could not be fetched from GitHub.`, source: "github", rows: 0, passages: 0, pass: false, fetchedAt });
  const text = response.ok ? await response.text() : localTargets;
  if (text.includes("\uFFFD")) return remember(brain, { path: filePath, status: "failed", reason: "The file is not valid UTF-8.", source: response.ok ? "github" : "local-fixture", rows: 0, passages: 0, pass: false, fetchedAt });
  let next = brain;
  const datasets = { ...(brain.datasets || {}) };
  let validation = null;
  if (DATASETS[filePath]) {
    const parsed = parseCsv(text);
    const dataLines = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#")).length - 1;
    validation = validateTable(filePath, parsed);
    if (dataLines !== parsed.rows.length) validation = { pass: false, checks: [...validation.checks, { name: "dropped_rows", pass: false, detail: `${dataLines} data lines vs ${parsed.rows.length} parsed rows` }] };
    else validation = { ...validation, checks: [...validation.checks, { name: "dropped_rows", pass: true, detail: `${parsed.rows.length} data lines kept` }] };
    datasets[DATASETS[filePath]] = { ...parsed, sample: true, source: filePath, validation };
  }
  if (filePath.endsWith("_consistency-check.json")) {
    try { datasets.consistency = { rows: [JSON.parse(text)], sample: true, source: filePath }; }
    catch { return remember(brain, { path: filePath, status: "failed", reason: "Consistency file is not valid JSON.", source: "github", rows: 0, passages: 0, pass: false, fetchedAt }); }
  }
  next = { ...next, datasets, semantic: datasets.revenue ? buildSemanticLayer() : next.semantic };
  if (filePath.endsWith(".md") || filePath.endsWith(".csv")) {
    const replaced = replaceDocument(next, { name: filePath, text, sourceId: filePath.startsWith("sample-data/") ? "sample" : "public-kb" });
    if (!replaced.ok) return remember(brain, { path: filePath, status: "failed", reason: replaced.error, source: response.ok ? "github" : "local-fixture", rows: 0, passages: 0, pass: false, fetchedAt });
    next = replaced.brain;
  }
  if (WORKFLOW_FILES[filePath]) {
    const map = parseWorkflow(text, WORKFLOW_FILES[filePath]);
    map.proposals = proposeAutomations(map, next.datasets || {});
    next = { ...next, workflowMaps: { ...(next.workflowMaps || {}), [map.departmentId]: map } };
  }
  const rows = datasets[DATASETS[filePath]]?.rows.length || (datasets.consistency && filePath.endsWith("_consistency-check.json") ? 1 : 0);
  const passages = (next.chunks || []).filter((chunk) => chunk.document === filePath).length;
  const failed = validation && validation.pass === false;
  return remember(next, { path: filePath, status: failed ? "failed" : "ingested", reason: failed ? validation.checks.filter((check) => !check.pass).map((check) => check.detail).join("; ") : "", source: response.ok ? "github" : "local-fixture", rows, passages, schema: datasets[DATASETS[filePath]]?.schema || [], checks: validation?.checks || [], pass: !failed, fetchedAt });
}

function remember(brain, record, ok = true) {
  const files = { ...(brain.quality?.files || {}), [record.path]: { ...record, driveId: brain.demo?.driveIndex?.[record.path] || "", sha: brain.demo?.sha || "" } };
  const datasets = brain.datasets || {};
  const ready = Boolean(datasets.revenue?.rows?.length && datasets.clients?.rows?.length && datasets.pipeline?.rows?.length && datasets.hours?.rows?.length);
  const instruction = ready ? validateInstruction(datasets) : (brain.instruction || { exported: false, pairs: 0, validated: false, lora: "not_executed" });
  const cross = crossCheck(datasets);
  const demoReady = Boolean(ready && instruction.validated && cross.pass && (brain.documents || []).length > 0);
  const next = { ...brain, demoReady, instruction, demo: { ...(brain.demo || {}), github: DEMO_GITHUB, driveUrl: DEMO_DRIVE }, quality: { sha: brain.demo?.sha || "", fetchedAt: record.fetchedAt, files, cross } };
  return { ok, brain: next, error: ok ? undefined : record.reason, sample: record.path.startsWith("sample-data/") || record.path.startsWith("workflows/") };
}

function validateInstruction(datasets) {
  const records = instructionRecords(datasets);
  const validated = records.length === QUESTIONS.length && records.every((record, index) => record.messages?.[1]?.content === QUESTIONS[index].question && String(record.messages?.[2]?.content || "").length > 10);
  return { exported: true, pairs: records.length, validated, lora: "not_executed", file: "training/ethikcorp-businessos-instruct.jsonl" };
}

function replaceDocument(brain, input) {
  const documents = (brain.documents || []).filter((document) => document.handoffId || document.name !== input.name);
  const chunks = (brain.chunks || []).filter((chunk) => chunk.handoffId || chunk.document !== input.name);
  return ingestDocument({ ...brain, documents, chunks }, input);
}
