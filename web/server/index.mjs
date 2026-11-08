import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { Github, validateRepo, validateUpload, cleanPMState } from "./github.mjs";
import { createDepartmentStore, handleDepartmentApi } from "./departments.mjs";
import { runtimeConfig } from "./runtimes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
const port = Number(process.env.PORT || 5052);
const github = new Github(process.env.GITHUB_TOKEN || "");
const departmentStore = createDepartmentStore(process.env.DEPARTMENT_STORE_PATH || path.join(root, ".data/departments.json"));
const runtimes = runtimeConfig();
const development = process.env.NODE_ENV !== "production";
const vite = development ? await createViteServer({ root, server: { middlewareMode: true }, appType: "custom" }) : null;

function json(res, code, value) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
}
async function readJson(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new Error("Request exceeds the 8 MB pilot limit.");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Invalid JSON request."); }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { const listeningPort = server.address()?.port || port; return [`http://127.0.0.1:${listeningPort}`, `http://localhost:${listeningPort}`].includes(new URL(origin).origin); }
  catch { return false; }
}
async function handleApi(req, res) {
  if (!sameOrigin(req)) return json(res, 403, { error: "Local origin required." });
  if (req.method === "GET" && req.url === "/api/health") return json(res, 200, { ok: true, githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN), mode: "local-preview" });
  if (req.url?.startsWith("/api/departments") || req.url === "/api/runtime/status") return handleDepartmentApi(req, res, { store: departmentStore, config: runtimes, readJson, json });
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  const body = await readJson(req);
  const repo = validateRepo(body.repo);
  if (req.url === "/api/github/test") {
    const data = await github.assertPrivate(repo);
    return json(res, 200, { fullName: data.full_name, branch: repo.branch, private: true });
  }
  if (req.url === "/api/github/save") {
    await github.assertPrivate(repo);
    const clean = cleanPMState(body.state);
    const result = await github.putContent(repo, `${repo.root}/state.json`, Buffer.from(JSON.stringify(clean, null, 2)), "Superbrain PM: update plan metadata");
    return json(res, 200, result);
  }
  if (req.url === "/api/github/load") {
    await github.assertPrivate(repo);
    const item = await github.getContent(repo, `${repo.root}/state.json`);
    if (!item?.content) return json(res, 404, { error: "No saved PM plan found in this repository." });
    return json(res, 200, { state: JSON.parse(Buffer.from(item.content.replace(/\s/g, ""), "base64").toString("utf8")) });
  }
  if (req.url === "/api/github/upload") {
    await github.assertPrivate(repo);
    const file = validateUpload(body);
    const safeName = file.fileName.replace(/[^A-Za-z0-9._-]/g, "-");
    const destination = `${repo.root}/sources/${file.sourceId}/${safeName}`;
    const result = await github.putContent(repo, destination, file.bytes, `Superbrain PM: add approved ${file.sourceId} source`);
    return json(res, 200, { ...result, indexingNote: file.extension === "md" ? "Markdown is ready for a separate GBrain import preview." : "This file still needs reviewed Markdown conversion before GBrain import." });
  }
  return json(res, 404, { error: "Unknown API endpoint." });
}
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/")) return await handleApi(req, res);
    if (vite) {
      return vite.middlewares(req, res, async () => {
        try {
          const html = await vite.transformIndexHtml(req.url || "/", fs.readFileSync(path.join(root, "index.html"), "utf8"));
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html);
        } catch (error) { vite.ssrFixStacktrace(error); json(res, 500, { error: "Development page failed." }); }
      });
    }
    const requested = decodeURIComponent((req.url || "/").split("?")[0]);
    const file = path.resolve(root, "dist", requested === "/" ? "index.html" : requested.replace(/^\//, ""));
    if (!file.startsWith(path.join(root, "dist") + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return json(res, 404, { error: "Not found." });
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff" });
    fs.createReadStream(file).pipe(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    json(res, req.url?.startsWith("/api/departments") || /Invalid|must|required|not configured|exceeds|private|approval/.test(message) ? 400 : 502, { error: message });
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Superbrain PM: http://127.0.0.1:${server.address().port}`));
