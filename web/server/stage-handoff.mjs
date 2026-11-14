import { createHash, randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { BUILD_STAGES } from "../shared/brain-stages.mjs";
import departments from "../shared/departments.json" with { type: "json" };
import { parseWorkbook, validateOwnership } from "../phase1/customer-logic.mjs";
import { Github, uploadSourceIds, validateRepo } from "./github.mjs";
import { ingestDocument, prepareDocument } from "./brain-pipeline.mjs";
import { parseGoldenQuestions } from "./brain-release.mjs";
import { extractSourceFile } from "./source-parser.mjs";
import { latestWithdrawal } from "./source-lifecycle.mjs";
import { parseBusinessTable } from "./business-intake.mjs";

const driveScope = "https://www.googleapis.com/drive/v3";
const maxBytes = 5 * 1024 * 1024;
const evidenceTypes = new Set(["md", "txt", "pdf", "docx", "xlsx", "csv", "json", "jsonl"]);
const driveKeys = ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN", "BRAIN_DRIVE_FOLDER_ID"];
const githubKeys = ["GITHUB_TOKEN", "BRAIN_GITHUB_REPOSITORY"];

export function handoffConfig(env) {
  const missing = (keys) => keys.filter((key) => !env[key]);
  return {
    github: { ready: !missing(githubKeys).length, missing: missing(githubKeys), destination: env.BRAIN_GITHUB_REPOSITORY || "" },
    drive: { ready: !missing(driveKeys).length, missing: missing(driveKeys), destination: env.BRAIN_DRIVE_FOLDER_ID || "" }
  };
}

async function driveRequest(url, init, fetcher) {
  const response = await fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status}). Check the account's access and OAuth scope.`);
  return response.json();
}

async function inspectDrive(env, fetcher) {
  const folder = env.BRAIN_DRIVE_FOLDER_ID;
  if (!/^[A-Za-z0-9_-]+$/.test(folder)) throw new Error("Invalid Google Drive folder ID.");
  const oauth = await driveRequest("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN
    })
  }, fetcher);
  if (!oauth.access_token) throw new Error("Google did not return a Drive access token.");
  const headers = { Authorization: `Bearer ${oauth.access_token}` };
  const meta = await driveRequest(`${driveScope}/files/${folder}?supportsAllDrives=true&fields=mimeType,capabilities(canAddChildren)`, { headers }, fetcher);
  if (meta.mimeType !== "application/vnd.google-apps.folder" || !meta.capabilities?.canAddChildren) throw new Error("The configured Google Drive folder is not writable.");
  let pageToken;
  do {
    const query = new URLSearchParams({ supportsAllDrives: "true", fields: "nextPageToken,permissions(type)", ...(pageToken ? { pageToken } : {}) });
    const page = await driveRequest(`${driveScope}/files/${folder}/permissions?${query}`, { headers }, fetcher);
    if (page.permissions?.some(({ type }) => type === "anyone" || type === "domain")) throw new Error("Use a Drive folder shared only with approved people or groups.");
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { folder, headers };
}

async function sendToDrive(env, file, fetcher) {
  const { folder, headers } = await inspectDrive(env, fetcher);
  const search = new URLSearchParams({
    q: `'${folder}' in parents and trashed = false and appProperties has { key='businessosHandoff' and value='${file.id}' }`,
    supportsAllDrives: "true", includeItemsFromAllDrives: "true", fields: "files(id,webViewLink)"
  });
  const matches = await driveRequest(`${driveScope}/files?${search}`, { headers }, fetcher);
  let item = matches.files?.[0];
  if (!item) {
    const boundary = randomUUID();
    const metadata = { name: `${file.stage} - ${file.name}`, parents: [folder], appProperties: { businessosHandoff: file.id } };
    const multipart = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
      file.bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    item = await driveRequest("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink", {
      method: "POST", headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart
    }, fetcher);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(item.id || "")) throw new Error("Google Drive did not return a file ID.");
  return { status: "uploaded", id: item.id, url: `https://drive.google.com/open?id=${item.id}` };
}

async function inspectGithub(env, client) {
  const [owner, name, extra] = env.BRAIN_GITHUB_REPOSITORY.split("/");
  if (extra !== undefined) throw new Error("Use owner/repository for the GitHub destination.");
  const repo = validateRepo({ owner, name, branch: env.BRAIN_GITHUB_BRANCH || "main", root: env.BRAIN_GITHUB_FOLDER || "businessbrain" });
  const info = await client.assertPrivate(repo);
  if (info?.full_name && info.full_name.toLowerCase() !== `${owner}/${name}`.toLowerCase()) throw new Error("The configured repository moved. Update the GitHub destination.");
  if (info?.archived || info?.disabled || info?.permissions?.push === false) throw new Error("The configured GitHub repository does not accept writes from this account.");
  return repo;
}

async function sendToGithub(env, file, client) {
  const repo = await inspectGithub(env, client);
  const path = `${repo.root}/stages/${file.stage}/${file.id.slice(0, 20)}-${file.name.replace(/[^A-Za-z0-9._-]/g, "-")}`;
  const prior = await client.getContent(repo, path);
  const blob = createHash("sha1").update(`blob ${file.bytes.length}\0`).update(file.bytes).digest("hex");
  if (prior && prior.sha !== blob) throw new Error("An existing GitHub file has different contents. Review the configured destination.");
  const result = prior ? { path, commit: "" } : await client.putContent(repo, path, file.bytes, `BusinessBrain: archive ${file.stage} handoff`);
  return { status: "uploaded", ...result, url: `https://github.com/${repo.owner}/${repo.name}/blob/${result.commit || repo.branch}/${path.split("/").map(encodeURIComponent).join("/")}` };
}

export async function verifyHandoffDestinations(env, { github = new Github(env.GITHUB_TOKEN), fetcher = fetch } = {}) {
  const config = handoffConfig(env);
  const checks = [
    ["github", () => inspectGithub(env, github), "Private repository and branch accessible. The first upload confirms Contents write access and branch rules."],
    ["drive", () => inspectDrive(env, fetcher), "Folder allows uploads for this account. No public or domain-wide folder permissions were returned."]
  ];
  return Object.fromEntries(await Promise.all(checks.map(async ([target, run, detail]) => {
    if (!config[target].ready) return [target, { status: "unconfigured", detail: `Missing ${config[target].missing.join(", ")}.` }];
    try {
      await run();
      return [target, { status: "verified", detail }];
    } catch (error) {
      return [target, { status: "failed", detail: error.message }];
    }
  })));
}

export async function stageHandoff(brain, input, env, { github = new Github(env.GITHUB_TOKEN), fetcher = fetch, extractSource = extractSourceFile } = {}) {
  const stage = BUILD_STAGES.find(({ id }) => id === input.stage);
  const name = typeof input.fileName === "string" ? input.fileName.trim() : "";
  const extension = name.toLowerCase().split(".").pop();
  const approvalRef = typeof input.approvalRef === "string" ? input.approvalRef.trim() : "";
  if (!stage || !name || name.length > 120 || /[\\/\x00-\x1f\x7f]/.test(name) || !evidenceTypes.has(extension)) throw new Error("Choose a valid stage and a supported file.");
  if (input.approved !== true || !approvalRef || approvalRef.length > 200) throw new Error("An owner approval reference is required.");
  if (typeof input.base64 !== "string" || input.base64.length > Math.ceil(maxBytes / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)) throw new Error("Upload a file up to 5 MB.");
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length || bytes.length > maxBytes || bytes.toString("base64") !== input.base64) throw new Error("The upload is not valid base64 or exceeds 5 MB.");
  const sourceId = stage.id === "intake" ? input.sourceId : "";
  const audience = stage.id === "intake" ? input.audience : "";
  let ownership;
  let table;
  const tableKind = stage.id === "intake" && extension === "csv" ? input.tableKind : "";
  let extracted, prepared;
  const golden = stage.id === "evaluation" && extension === "jsonl"
    ? parseGoldenQuestions(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
    : null;
  if (stage.id === "ownership") {
    if (extension !== "xlsx") throw new Error("Discovery requires the completed .xlsx ownership workbook.");
    ownership = validateOwnership(await parseWorkbook(bytes));
    if (!ownership.ok) throw new Error(ownership.errors.map(({ message }) => message).join(" "));
  }
  if (stage.id === "intake" && extension === "csv") {
    if (!brain.ownershipReady) throw new Error("Import the ownership workbook first.");
    table = parseBusinessTable(tableKind, bytes);
  } else if (stage.id === "intake") {
    const source = (brain.ownership || []).find((row) => row.sourceId === sourceId);
    if (!uploadSourceIds.has(sourceId) || !source || source.notForAi) throw new Error("Import the ownership workbook and choose a source approved for this pilot.");
    if (audience !== "company" && !departments.some(({ id }) => id === audience)) throw new Error("Choose who may retrieve this source.");
    const withdrawal = latestWithdrawal(brain, { sourceId, name });
    if (withdrawal?.previousApprovals.some((reference) => reference.toLowerCase() === approvalRef.toLowerCase())) {
      throw new Error("This source was withdrawn. Enter a new owner approval reference to restore it.");
    }
    extracted = await extractSource(extension, bytes);
    prepared = prepareDocument({ name, text: extracted.text, extractedFormat: extracted.format });
    if (!prepared.ok) throw new Error(prepared.error);
  }
  const config = handoffConfig(env);
  const identity = table ? [stage.id, tableKind, name, "analytics"] : [stage.id, sourceId, name, audience];
  const id = createHash("sha256").update(JSON.stringify(identity)).update(bytes).digest("hex");
  const previous = (brain.handoffs || []).find((file) => file.id === id);
  if (!previous && (brain.handoffs || []).length >= 250) throw new Error("The workspace has reached its 250-file handoff limit.");
  const file = { id, stage: stage.id, name, bytes };
  const destinations = previous?.withdrawnAt && !previous.restoring ? {} : { ...previous?.destinations };
  const operations = { github: () => sendToGithub(env, file, github), drive: () => sendToDrive(env, file, fetcher) };
  for (const target of ["github", "drive"]) {
    if (destinations[target]?.status === "uploaded") continue;
    if (!config[target].ready) {
      destinations[target] = { status: "unconfigured", detail: `Missing ${config[target].missing.join(", ")}.` };
      continue;
    }
    try { destinations[target] = await operations[target](); }
    catch (error) { destinations[target] = { status: "failed", detail: error.message }; }
  }
  let next = brain;
  const delivered = Object.values(destinations).every(({ status }) => status === "uploaded");
  let indexed = Boolean(previous?.indexed);
  if (delivered && !indexed && stage.id === "intake" && !table) {
    const result = ingestDocument(next, { name, sourceId, audience, handoffId: id, sourceUrl: destinations.github.url }, prepared);
    next = result.brain;
    indexed = result.ok;
  }
  if (delivered && table && !previous?.indexed) {
    next = { ...next, businessMode: "uploaded", businessTables: { ...next.businessTables, [tableKind]: { ...table, source: name, url: destinations.github.url, handoffId: id, importedAt: new Date().toISOString() } } };
    indexed = true;
  }
  if (delivered && ownership) next = { ...next, ownershipReady: true, ownership: ownership.rows };
  if (delivered && golden) next = { ...next, golden: { id, questions: golden } };
  const receipt = {
    id, stage: stage.id, sourceId: table ? "" : sourceId, audience: table ? "executive" : audience, name, destinations, approvalRef, indexed, ...(table ? { tableKind, rows: table.rows.length } : {}),
    ...(previous?.withdrawnAt && !delivered ? { withdrawnAt: previous.withdrawnAt, restoring: true } : {}),
    ...(extracted?.pages ? { pages: extracted.pages, textPages: extracted.textPages } : {}),
    at: new Date().toISOString()
  };
  return { brain: { ...next, handoffs: [...(next.handoffs || []).filter((item) => item.id !== id), receipt] }, receipt };
}
