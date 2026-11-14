import { DurableObject } from "cloudflare:workers";
import { createWorkspaceApi } from "../server/workspace-api.mjs";
import { createDepartmentStoreCore } from "../server/department-core.mjs";
import { createTeamIdentity, teamConfig } from "../server/team-identity.mjs";

const workspaceName = "ethikcorp-businessos";
const partSize = 256 * 1024;
const maxStateBytes = 32 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let identityCache;

function workspaceConfig(env) {
  const config = teamConfig(env);
  if (!config) throw new Error("BusinessOS team authentication is required.");
  return config;
}

function identity(config, roster) {
  const { issuer, audience } = config;
  if (identityCache?.issuer !== issuer || identityCache?.audience !== audience || identityCache?.roster !== roster) {
    identityCache = { issuer, audience, roster, verify: createTeamIdentity(config) };
  }
  return identityCache;
}

function protect(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "same-origin");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function failure(status, error) {
  return protect(Response.json({ error }, { status }));
}

export default {
  async fetch(request, env) {
    let config;
    try {
      config = workspaceConfig(env);
    } catch {
      return failure(503, "BusinessOS team authentication is not configured.");
    }
    const url = new URL(request.url);
    if (url.origin !== config.origin) return failure(403, "Use the configured team hostname.");
    const verifier = identity(config, env.BRAIN_TEAM_ROSTER);
    const token = request.headers.get("cf-access-jwt-assertion");
    const result = await verifier.verify(token);
    const member = result.member && config.members.get(result.member.email);
    if (!member) return failure(result.status === 401 ? 401 : 403, "Sign in with an approved workspace account.");
    if (!url.pathname.startsWith("/api/")) return protect(await env.ASSETS.fetch(request));
    const headers = new Headers(request.headers);
    headers.delete("cf-access-jwt-assertion");
    headers.set("x-businessos-verified-member", member.email);
    const stub = env.BUSINESSOS_WORKSPACE.getByName(workspaceName);
    return protect(await stub.fetch(new Request(request, { headers })));
  }
};

function stateStorage(storage) {
  const sql = storage.sql;
  sql.exec("CREATE TABLE IF NOT EXISTS state_parts (name TEXT NOT NULL, idx INTEGER NOT NULL, body BLOB NOT NULL, PRIMARY KEY(name, idx))");
  return {
    read(name) {
      const parts = [...sql.exec("SELECT body FROM state_parts WHERE name = ? ORDER BY idx", name)];
      if (!parts.length) return null;
      const bytes = new Uint8Array(parts.reduce((sum, { body }) => sum + body.byteLength, 0));
      let offset = 0;
      for (const { body } of parts) {
        bytes.set(new Uint8Array(body), offset);
        offset += body.byteLength;
      }
      return JSON.parse(decoder.decode(bytes));
    },
    write(name, state) {
      const bytes = encoder.encode(JSON.stringify(state));
      if (bytes.byteLength > maxStateBytes) throw new Error("BusinessOS storage limit reached. Remove unused sources or records.");
      storage.transactionSync(() => {
        sql.exec("DELETE FROM state_parts WHERE name = ?", name);
        for (let offset = 0; offset < bytes.length; offset += partSize) {
          sql.exec("INSERT INTO state_parts VALUES (?, ?, ?)", name, offset / partSize, bytes.slice(offset, offset + partSize));
        }
      });
    }
  };
}

export class BusinessOSWorkspace extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.team = workspaceConfig(env);
    const state = stateStorage(ctx.storage);
    const departmentStore = createDepartmentStoreCore(state.read("departments"), (next) => state.write("departments", next));
    this.handleApi = createWorkspaceApi({
      env, team: this.team, departmentStore,
      readBrain: () => state.read("brain"),
      persistBrain: (next) => state.write("brain", next)
    });
  }

  async fetch(request) {
    // Only the private Durable Object binding reaches this method. The front Worker overwrites the member header.
    const member = this.team.members.get(request.headers.get("x-businessos-verified-member"));
    if (!member) return failure(403, "Use an approved workspace account.");
    const url = new URL(request.url);
    const input = {
      url: url.pathname + url.search,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      async *[Symbol.asyncIterator]() {
        if (request.body) yield* request.body;
      }
    };
    const chunks = [];
    let status;
    let headers;
    const output = {
      writeHead(code, values) { status = code; headers = values; },
      write(chunk) { chunks.push(chunk); },
      end(chunk) { if (chunk !== undefined) chunks.push(chunk); }
    };
    try {
      await this.handleApi(input, output, member);
      if (!status) return failure(500, "BusinessOS did not return a response.");
      return new Response(new Blob(chunks), { status, headers });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const expected = /Invalid JSON|exceeds the 8 MB|storage limit/.test(message);
      return failure(expected ? 400 : 502, expected ? message : "BusinessOS could not complete this request.");
    }
  }
}
