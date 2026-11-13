import { createRemoteJWKSet, jwtVerify } from "jose";
import departments from "../shared/departments.json" with { type: "json" };

const departmentIds = new Set(departments.map(({ id }) => id));
const roles = new Set(["dev", "ceo", "head"]);

export function teamConfig(env) {
  if (!env.BRAIN_TEAM_ORIGIN) {
    if (env.BRAIN_ACCESS_ISSUER || env.BRAIN_ACCESS_AUDIENCE) throw new Error("Set the team origin before enabling Cloudflare Access.");
    return null;
  }
  if (env.NODE_ENV !== "production" || env.BRAIN_LOCAL_DEVELOPMENT === "true" || env.PORTAL_MODE === "customer") {
    throw new Error("Team mode requires a production build and a dedicated team workspace.");
  }
  const origin = new URL(env.BRAIN_TEAM_ORIGIN);
  if (origin.protocol !== "https:" || origin.origin !== env.BRAIN_TEAM_ORIGIN) throw new Error("Use a canonical HTTPS team origin.");
  const issuer = env.BRAIN_ACCESS_ISSUER;
  const audience = env.BRAIN_ACCESS_AUDIENCE;
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || "") || !audience) {
    throw new Error("Set the Cloudflare Access issuer and application audience.");
  }
  const roster = JSON.parse(env.BRAIN_TEAM_ROSTER || "{}");
  if (!roster || Array.isArray(roster) || typeof roster !== "object") throw new Error("Team roster must map approved emails to roles.");
  const members = new Map();
  for (const [email, member] of Object.entries(roster)) {
    const normalized = email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || members.has(normalized) || !roles.has(member?.role)
      || (member.role === "head" && !departmentIds.has(member.department))) throw new Error("Invalid member in the team roster.");
    members.set(normalized, { email: normalized, role: member.role, ...(member.role === "head" ? { department: member.department } : {}) });
  }
  if (![...members.values()].some(({ role }) => role === "dev")) throw new Error("The team roster needs a developer.");
  return { origin: origin.origin, host: origin.host, issuer, audience, members };
}

export function createTeamIdentity(config, keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", config.issuer))) {
  return async (token) => {
    if (typeof token !== "string" || token.length > 16000) return { status: 401 };
    try {
      const { payload } = await jwtVerify(token, keys, {
        algorithms: ["RS256"], issuer: config.issuer, audience: config.audience, requiredClaims: ["exp", "sub", "email"]
      });
      const member = typeof payload.email === "string" && config.members.get(payload.email.toLowerCase());
      return member ? { status: 200, member } : { status: 403 };
    } catch {
      return { status: 401 };
    }
  };
}

const teamBrainWrites = new Set([
  "/api/brain/ownership", "/api/brain/handoff", "/api/brain/verify-destinations", "/api/brain/sources/withdraw", "/api/brain/reset", "/api/brain/tables/remove", "/api/brain/confirm", "/api/brain/evaluate", "/api/brain/deploy",
  "/api/brain/demo/plan", "/api/brain/demo/file", "/api/brain/pin", "/api/brain/task",
  "/api/brain/automation", "/api/brain/automation/toggle", "/api/brain/automation/run"
]);

export function teamPermits(member, method, pathname, release) {
  if (method === "GET" && ["/api/health", "/api/brain/state"].includes(pathname)) return true;
  if (method === "GET" && pathname === "/api/runtime/status") return member.role === "dev";
  if (method === "GET" && pathname === "/api/brain/ownership-template") return member.role === "dev";
  if (method === "GET" && pathname === "/api/brain/business-template") return member.role === "dev";
  if (method === "POST" && pathname === "/api/brain/ask-release") return true;
  if (method === "POST" && teamBrainWrites.has(pathname)) return member.role === "dev";
  if (method === "GET" && pathname === "/api/departments") return true;
  if (method === "GET" && /^\/api\/ceo\/dashboard(?:\/[a-z0-9-]+)?$/.test(pathname)) return member.role !== "head";

  const workspace = pathname.match(/^\/api\/departments\/([a-z0-9-]+)(?:\/(.*))?$/);
  if (!workspace || !departmentIds.has(workspace[1])) return false;
  const [, department, endpoint = ""] = workspace;
  if (member.role === "head" && member.department !== department) return false;
  if (method === "GET") return endpoint === "" || endpoint === "export";
  if (method === "POST" && /^automations\/[a-z0-9-]+\/review$/.test(endpoint)) return member.role === "ceo";
  if (method === "POST" && endpoint === "automations") return true;
  if (member.role === "ceo") return (method === "POST" && /^(?:tasks|runs\/[a-z0-9-]+\/review)$/.test(endpoint)) ||
    (method === "PATCH" && /^tasks\/[a-z0-9-]+$/.test(endpoint)) || (method === "POST" && endpoint === "runs" && Boolean(release?.departments.includes(department)));
  if (method === "PATCH") return /^(?:settings|(?:tasks|memory)\/[a-z0-9-]+)$/.test(endpoint);
  if (method !== "POST") return false;
  if (/^(?:tasks|memory|handoffs|runs\/[a-z0-9-]+\/review)$/.test(endpoint)) return true;
  return Boolean(release?.departments.includes(department)) && /^(?:messages|runs|runs\/[a-z0-9-]+\/refresh)$/.test(endpoint);
}
