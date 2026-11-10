import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleRequest } from "./worker.mjs";
import { memoryRepository } from "./repository.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");
const repo = memoryRepository();
const env = {
  REPO: repo,
  ACCESS_CODE: process.env.ACCESS_CODE || "review",
  STAFF_CODE: process.env.STAFF_CODE || "staff-review",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev-only-session-secret"
};
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".svg": "image/svg+xml" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname.startsWith("/api") || url.pathname === "/enter") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(url, { method: req.method, headers: req.headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks) });
    const response = await handleRequest(request, env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  const relative = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
  const file = path.join(dist, relative);
  if (!file.startsWith(dist)) { res.statusCode = 403; res.end("Forbidden"); return; }
  try {
    const body = await readFile(file);
    res.setHeader("content-type", types[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    const body = await readFile(path.join(dist, "index.html"));
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(body);
  }
});

const port = Number(process.env.PORT || 5061);
server.listen(port, "127.0.0.1", () => console.log(`Phase 1 customer: http://127.0.0.1:${port}`));
