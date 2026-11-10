const encoder = new TextEncoder();
const encode = (value) => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function decode(value) { return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")), (char) => char.charCodeAt(0)); }

async function hmacKey(secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("Cloud workspace sessions are not configured.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signInvite(secret, role, expires, timestamp = Date.now()) {
  const exp = expires || Math.floor(timestamp / 1000) + 7 * 24 * 60 * 60;
  const payload = `d1.${role}.${exp}`;
  const signature = encode(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(payload)));
  return `${payload}.${signature}`;
}

export async function readInvite(secret, token, timestamp = Date.now()) {
  const match = String(token || "").match(/^d1\.(customer|dev)\.(\d{10})\.([A-Za-z0-9_-]+)$/);
  if (!match || Number(match[2]) <= Math.floor(timestamp / 1000)) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), decode(match[3]), encoder.encode(`d1.${match[1]}.${match[2]}`));
    return valid ? { role: match[1], expires: Number(match[2]) } : null;
  } catch {
    return null;
  }
}
