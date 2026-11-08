import { Buffer } from "node:buffer";

export const uploadSourceIds = new Set(["profile", "policies", "sops", "tasks", "marketing"]);
const allowedExtensions = new Set(["md", "txt", "pdf", "docx"]);

function assertString(value, name, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Invalid ${name}.`);
  return value.trim();
}

export function validateRepo(input) {
  if (!input || typeof input !== "object") throw new Error("Repository fields are required.");
  const owner = assertString(input.owner, "GitHub owner", 100);
  const name = assertString(input.name, "repository name", 100);
  const branch = assertString(input.branch, "branch", 100);
  const root = assertString(input.root, "PM folder", 150).replace(/^\/+|\/+$/g, "");
  if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(name)) throw new Error("Owner and repository name contain invalid characters.");
  if (!/^[A-Za-z0-9._-]+$/.test(branch) || branch.includes("..")) throw new Error("Use a simple branch name without slashes.");
  if (!root.split("/").every((segment) => /^[A-Za-z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..")) throw new Error("PM folder contains an invalid path segment.");
  return { owner, name, branch, root };
}

export function validateUpload(input) {
  const sourceId = assertString(input.sourceId, "source category", 40);
  if (!uploadSourceIds.has(sourceId)) throw new Error("This source category is metadata-only in the pilot.");
  if (input.approved !== true) throw new Error("Owner approval is required before upload.");
  assertString(input.owner, "named client owner", 200);
  assertString(input.originalLocator, "original source location", 1000);
  assertString(input.approvalRef, "client approval reference", 200);
  const fileName = assertString(input.fileName, "file name", 150);
  if (fileName.includes("/") || fileName.includes("\\") || fileName === "." || fileName === "..") throw new Error("File name must not contain a path.");
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.has(extension)) throw new Error("Use Markdown, text, PDF or DOCX files.");
  if (typeof input.base64 !== "string" || !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64)) throw new Error("Invalid file content.");
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.length === 0 || bytes.length > 5 * 1024 * 1024) throw new Error("File must be between 1 byte and 5 MB.");
  return { sourceId, fileName, bytes, extension };
}

export function cleanPMState(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid PM plan.");
  const checked = {};
  for (const [key, value] of Object.entries(input.checked || {})) {
    if (/^[a-z0-9-]{1,80}$/.test(key) && typeof value === "boolean") checked[key] = value;
  }
  const records = {};
  for (const [key, raw] of Object.entries(input.records || {})) {
    if (!/^[a-z0-9-]{1,50}$/.test(key) || !raw || typeof raw !== "object") continue;
    const record = raw;
    records[key] = {
      status: ["not-started", "located", "uploaded", "excluded"].includes(record.status) ? record.status : "not-started",
      owner: typeof record.owner === "string" ? record.owner.slice(0, 200) : "",
      locator: typeof record.locator === "string" ? record.locator.slice(0, 1000) : "",
      approvalRef: typeof record.approvalRef === "string" ? record.approvalRef.slice(0, 200) : "",
      note: typeof record.note === "string" ? record.note.slice(0, 500) : "",
      githubPath: typeof record.githubPath === "string" ? record.githubPath.slice(0, 300) : "",
      fileName: typeof record.fileName === "string" ? record.fileName.slice(0, 150) : ""
    };
  }
  return { schemaVersion: 1, checked, records, lastReview: typeof input.lastReview === "string" ? input.lastReview : null, savedAt: new Date().toISOString() };
}

export class Github {
  constructor(token) { this.token = token; }
  async request(path, init = {}) {
    if (!this.token) throw new Error("GITHUB_TOKEN is not configured on the local server.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`https://api.github.com${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${this.token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "superbrain-pm-local",
          ...(init.body ? { "Content-Type": "application/json" } : {})
        }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = response.status === 404 ? "Repository, branch or file not found, or token access is missing." : (data.message || `GitHub request failed (${response.status}).`);
        const error = new Error(message); error.status = response.status; throw error;
      }
      return data;
    } finally { clearTimeout(timer); }
  }
  repoPath(repo) { return `/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`; }
  async assertPrivate(repo) {
    const data = await this.request(this.repoPath(repo));
    if (data.private !== true) throw new Error("The repository must be private before this pilot can save data.");
    await this.request(`${this.repoPath(repo)}/branches/${encodeURIComponent(repo.branch)}`);
    return data;
  }
  async getContent(repo, path) {
    try { return await this.request(`${this.repoPath(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(repo.branch)}`); }
    catch (error) { if (error.status === 404) return null; throw error; }
  }
  async putContent(repo, path, bytes, message) {
    const prior = await this.getContent(repo, path);
    const data = await this.request(`${this.repoPath(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      body: JSON.stringify({ message, content: bytes.toString("base64"), branch: repo.branch, ...(prior?.sha ? { sha: prior.sha } : {}) })
    });
    return { path, commit: data.commit?.sha || "" };
  }
}
