import { parseCsv } from "./csv.mjs";
import { ingestDocument } from "./brain-pipeline.mjs";
import { WORKFLOW_FILES, parseWorkflow, proposeAutomations } from "./workflows.mjs";

export const DEMO_GITHUB = "https://github.com/Jaferdecodesai/ethikcorp-businessos-demo-data";
export const DEMO_RAW = "https://raw.githubusercontent.com/Jaferdecodesai/ethikcorp-businessos-demo-data/main/";
export const DEMO_DRIVE = "https://drive.google.com/drive/folders/1sjU5DFEFRSwi1WcJFDz9tPRFwPHouut4";
const TREE = "https://api.github.com/repos/Jaferdecodesai/ethikcorp-businessos-demo-data/git/trees/main?recursive=1";

const DATASETS = {
  "sample-data/monthly-revenue-by-service-line.csv": "revenue",
  "sample-data/sales-pipeline.csv": "pipeline",
  "sample-data/clients.csv": "clients",
  "sample-data/department-headcount-and-hours.csv": "hours"
};

export function wantedPath(path) {
  return path.endsWith(".md") || path.endsWith(".csv") || path.endsWith("_consistency-check.json");
}

export async function demoPlan(fetchImpl = fetch) {
  const manifestResponse = await fetchImpl(`${DEMO_RAW}drive-manifest.json`);
  const manifest = manifestResponse.ok ? await manifestResponse.json() : { files: [] };
  const drive = await probeDrive(fetchImpl, manifest);
  const treeResponse = await fetchImpl(TREE, { headers: { accept: "application/vnd.github+json", "user-agent": "ethikcorp-businessos-review" } });
  if (!treeResponse.ok) throw new Error("The public GitHub demo repository could not be listed.");
  const tree = await treeResponse.json();
  const files = (tree.tree || []).filter((item) => item.type === "blob" && wantedPath(item.path)).map((item) => ({ path: item.path, size: item.size }));
  return { github: DEMO_GITHUB, raw: DEMO_RAW, driveUrl: DEMO_DRIVE, drive, files };
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
  if (!response.ok) return { ok: false, brain, error: `${filePath} could not be fetched from GitHub.` };
  const text = await response.text();
  let next = brain;
  const datasets = { ...(brain.datasets || {}) };
  if (DATASETS[filePath]) datasets[DATASETS[filePath]] = { ...parseCsv(text), sample: true, source: filePath };
  if (filePath.endsWith("_consistency-check.json")) datasets.consistency = { rows: [JSON.parse(text)], sample: true, source: filePath };
  next = { ...next, datasets };
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
  next = { ...next, demo: { ...(next.demo || {}), github: DEMO_GITHUB, driveUrl: DEMO_DRIVE } };
  return { ok: true, brain: next, sample: filePath.startsWith("sample-data/") || filePath.startsWith("workflows/") };
}

function replaceDocument(brain, input) {
  const documents = (brain.documents || []).filter((document) => document.name !== input.name);
  const chunks = (brain.chunks || []).filter((chunk) => chunk.document !== input.name);
  return ingestDocument({ ...brain, documents, chunks }, input);
}
