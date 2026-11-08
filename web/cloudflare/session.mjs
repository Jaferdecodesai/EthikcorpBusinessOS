export const SESSION_LIFETIME = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();
const cookieName = (url) => url.protocol === "https:" ? "__Host-superbrain-preview" : "superbrain-preview-local";
const encode = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
function decode(value) { return Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length / 4) * 4,"=")), c=>c.charCodeAt(0)); }
async function key(secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("Cloud workspace sessions are not configured.");
  return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
export async function readSession(request, secret, timestamp = Date.now()) {
  const url = new URL(request.url);
  const cookies = (request.headers.get("Cookie") || "").split(";").map(c=>c.trim());
  const raw = cookies.find(c=>c.startsWith(cookieName(url)+"="))?.slice(cookieName(url).length+1);
  if (!raw || raw.length > 180) return null;
  const match = raw.match(/^v1\.([a-f0-9-]{36})\.(\d{10})\.([A-Za-z0-9_-]{43})$/);
  if (!match || Number(match[2]) <= Math.floor(timestamp / 1000) || Number(match[2]) > Math.floor(timestamp / 1000)+SESSION_LIFETIME+60) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC",await key(secret),decode(match[3]),encoder.encode(`v1.${match[1]}.${match[2]}`));
    return valid ? {id:match[1],expires:Number(match[2])} : null;
  } catch { return null; }
}
export async function createSession(request, secret, timestamp = Date.now()) {
  const id = crypto.randomUUID(), expires = Math.floor(timestamp / 1000) + SESSION_LIFETIME;
  const payload = `v1.${id}.${expires}`;
  const signature = encode(await crypto.subtle.sign("HMAC",await key(secret),encoder.encode(payload)));
  const url = new URL(request.url);
  return { id, expires, cookie: `${cookieName(url)}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_LIFETIME}${url.protocol==="https:"?"; Secure":""}` };
}

export function checkApiRequest(request) {
  const url = new URL(request.url), origin = request.headers.get("Origin");
  if (request.headers.get("Sec-Fetch-Site") === "cross-site" || (origin && origin !== url.origin)) return {status:403,error:"Use this app from its own origin."};
  if (!["GET","HEAD","POST","PATCH"].includes(request.method)) return {status:405,error:"Method not allowed."};
  if (["POST","PATCH"].includes(request.method)) {
    if (origin !== url.origin) return {status:403,error:"A same-origin request is required."};
    if (!/^application\/json(?:;|$)/i.test(request.headers.get("Content-Type")||"")) return {status:415,error:"Send JSON to this endpoint."};
    if (Number(request.headers.get("Content-Length")||0) > 65536) return {status:413,error:"Preview request exceeds 64 KB."};
  }
  return null;
}
