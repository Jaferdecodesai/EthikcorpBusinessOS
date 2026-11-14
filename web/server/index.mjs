import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createDepartmentStore } from "./departments.mjs";
import { createTeamIdentity, teamConfig } from "./team-identity.mjs";
import { createWorkspaceApi } from "./workspace-api.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
const port = Number(process.env.PORT || 5052);
const localBuild = process.env.BRAIN_LOCAL_DEVELOPMENT === "true" && process.env.PORTAL_MODE !== "customer";
const team = teamConfig(process.env);
if (process.env.BRAIN_REQUIRE_TEAM === "true" || process.argv.includes("--require-team")) {
  if (!team) throw new Error("Configure Cloudflare Access and the team roster before starting the team portal.");
  const stores = [process.env.BRAIN_DATA_FILE, process.env.DEPARTMENT_STORE_PATH];
  if (!stores.every((file) => file && path.isAbsolute(file)) || path.resolve(stores[0]) === path.resolve(stores[1])) {
    throw new Error("Set distinct absolute paths on persistent storage for the brain and department stores.");
  }
  if (!fs.existsSync(path.join(root, "dist/index.html"))) throw new Error("Build the standard Node portal before starting the team portal.");
}
const identifyTeamMember = team && createTeamIdentity(team);
const managedBuild = Boolean(team || localBuild);
const brainFile = managedBuild ? path.resolve(process.env.BRAIN_DATA_FILE || path.join(root, team ? ".data/team-brain.json" : ".data/brain.json")) : null;
const departmentStore = createDepartmentStore(process.env.DEPARTMENT_STORE_PATH || path.join(root, team ? ".data/team-departments.json" : ".data/departments.json"));
const handleApi = createWorkspaceApi({
  env: process.env, team, localBuild, departmentStore, getPort: () => server.address()?.port || port,
  readBrain: () => brainFile && fs.existsSync(brainFile) ? JSON.parse(fs.readFileSync(brainFile, "utf8")) : null,
  persistBrain(next) {
    if (!brainFile) return;
    fs.mkdirSync(path.dirname(brainFile), { recursive: true, mode: 0o700 });
    fs.writeFileSync(`${brainFile}.tmp`, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(`${brainFile}.tmp`, brainFile);
  }
});

function json(res, code, value) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(value));
}

const development = process.env.NODE_ENV !== "production";
const privateFiles = ["**/.data/**", ...(brainFile ? [brainFile, `${brainFile}.tmp`] : [])];
const vite = development ? await createViteServer({ root, server: { middlewareMode: true, watch: { ignored: privateFiles }, fs: { deny: ["**/.env*", "**/*.{crt,pem}", "**/.git/**", ...privateFiles] } }, appType: "custom" }) : null;

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
const server = http.createServer(async (req, res) => {
  try {
    if (localBuild) {
      const boundPort = server.address()?.port;
      if (![`127.0.0.1:${boundPort}`, `localhost:${boundPort}`].includes(req.headers.host)) {
        return json(res, 403, { error: "Use the local workspace address." });
      }
    }
    let member;
    if (team) {
      if (req.headers.host !== team.host) return json(res, 403, { error: "Use the configured team hostname." });
      const identity = await identifyTeamMember(req.headers["cf-access-jwt-assertion"]);
      if (!identity.member) return json(res, identity.status, { error: "Sign in with an approved workspace account." });
      member = identity.member;
      res.setHeader("Cache-Control", "private, no-store");
    }
    if (req.url?.startsWith("/api/")) return await handleApi(req, res, member);
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
