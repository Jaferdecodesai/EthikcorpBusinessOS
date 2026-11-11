import { parseCsv } from "./csv.mjs";
import { ingestDocument } from "./brain-pipeline.mjs";
import { KPI_TARGETS_CSV, KPI_TARGETS_PATH } from "./kpi-targets.mjs";
import { crossCheck, validateTable } from "./quality.mjs";
import { buildSemanticLayer } from "./semantic.mjs";
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

export function wantedPath(path) {
  return path.endsWith(".md") || path.endsWith(".csv") || path.endsWith("_consistency-check.json");
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
  const files = (tree.tree || []).filter((item) => item.type === "blob" && wantedPath(item.path)).map((item) => ({ path: item.path, size: item.size, sha: item.sha }));
  if (!files.some((item) => item.path === KPI_TARGETS_PATH)) files.push({ path: KPI_TARGETS_PATH, size: KPI_TARGETS_CSV.length, sha: "local-fixture", local: true });
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

export async function ingestDemoFile(brain, filePath, fetchImpl = fetch) {
  const response = await fetchImpl(`${DEMO_RAW}${filePath}`);
  const localTargets = filePath === KPI_TARGETS_PATH ? KPI_TARGETS_CSV : "";
  if (!response.ok && !localTargets) return { ok: false, brain, error: `${filePath} could not be fetched from GitHub.` };
  const text = response.ok ? await response.text() : localTargets;
  let next = brain;
  const datasets = { ...(brain.datasets || {}) };
  const fetchedAt = new Date().toISOString();
  if (DATASETS[filePath]) {
    const parsed = parseCsv(text);
    const validation = validateTable(filePath, parsed);
    datasets[DATASETS[filePath]] = { ...parsed, sample: true, source: filePath, validation };
  }
  if (filePath.endsWith("_consistency-check.json")) datasets.consistency = { rows: [JSON.parse(text)], sample: true, source: filePath };
  next = { ...next, datasets, semantic: datasets.revenue ? buildSemanticLayer() : next.semantic };
  if (filePath.endsWith(".md") || filePath.endsWith(".csv")) {
    const replaced = replaceDocument(next, { name: filePath, text, sourceId: filePath.startsWith("sample-data/") ? "sample" : "public-kb" });
    if (!replaced.ok) return { ok: false, brain, error: replaced.error };
    next = replaced.brain;
  }
  if (WORKFLOW_FILES[filePath]) {
    const map = parseWorkflow(text, WORKFLOW_FILES[filePath]);
    map.proposals = proposeAutomations(map, next.datasets || {});
    next = { ...next, workflowMaps: { ...(next.workflowMaps || {}), [map.departmentId]: map } };
  }
  const fileRecord = { path: filePath, source: "github", driveId: next.demo?.driveIndex?.[filePath] || "", sha: next.demo?.sha || "", fetchedAt, rows: datasets[DATASETS[filePath]]?.rows.length || 0, schema: datasets[DATASETS[filePath]]?.schema || [], checks: datasets[DATASETS[filePath]]?.validation?.checks || [], pass: datasets[DATASETS[filePath]]?.validation?.pass !== false };
  const files = { ...(next.quality?.files || {}), [filePath]: fileRecord };
  next = { ...next, demo: { ...(next.demo || {}), github: DEMO_GITHUB, driveUrl: DEMO_DRIVE }, quality: { sha: next.demo?.sha || "", fetchedAt, files, cross: crossCheck(next.datasets || {}) } };
  return { ok: true, brain: next, sample: filePath.startsWith("sample-data/") || filePath.startsWith("workflows/") };
}

function replaceDocument(brain, input) {
  const documents = (brain.documents || []).filter((document) => document.name !== input.name);
  const chunks = (brain.chunks || []).filter((chunk) => chunk.document !== input.name);
  return ingestDocument({ ...brain, documents, chunks }, input);
}
