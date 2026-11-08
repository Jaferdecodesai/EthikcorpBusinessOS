import test from "node:test";
import assert from "node:assert/strict";
import { createSession, readSession, checkApiRequest, SESSION_LIFETIME } from "../cloudflare/session.mjs";
import { createDepartmentStoreCore } from "../server/department-core.mjs";

test("cloud sessions are signed, scoped cookies and reject tampering or expiry",async()=>{
  const secret="synthetic-test-secret-with-at-least-32-characters";
  const request=new Request("https://superbrain.example/api/session");
  const now=Date.now(), session=await createSession(request,secret,now);
  assert.match(session.cookie,/__Host-superbrain-preview=/);assert.match(session.cookie,/HttpOnly; SameSite=Strict/);assert.match(session.cookie,/; Secure$/);
  const signedRequest=new Request(request,{headers:{Cookie:session.cookie.split(";")[0]}});
  assert.equal((await readSession(signedRequest,secret,now)).id,session.id);
  assert.equal(await readSession(signedRequest,"another-secret-with-at-least-32-characters",now),null);
  assert.equal(await readSession(signedRequest,secret,now+(SESSION_LIFETIME+1)*1000),null);
  const tampered=new Request(request,{headers:{Cookie:session.cookie.split(";")[0].replace(session.id,crypto.randomUUID())}});
  assert.equal(await readSession(tampered,secret,now),null);
});
test("cloud API rejects cross-origin, missing-origin and non-JSON writes",()=>{
  const url="https://superbrain.example/api/departments/sales/tasks";
  assert.equal(checkApiRequest(new Request(url,{method:"POST",headers:{Origin:"https://evil.example","Content-Type":"application/json"}})).status,403);
  assert.equal(checkApiRequest(new Request(url,{method:"POST",headers:{"Content-Type":"application/json"}})).status,403);
  assert.equal(checkApiRequest(new Request(url,{method:"POST",headers:{Origin:"https://superbrain.example","Content-Type":"text/plain"}})).status,415);
  assert.equal(checkApiRequest(new Request(url,{method:"POST",headers:{Origin:"https://superbrain.example","Content-Type":"application/json","Content-Length":"70000"}})).status,413);
  assert.equal(checkApiRequest(new Request(url,{method:"POST",headers:{Origin:"https://superbrain.example","Content-Type":"application/json"}})),null);
});
test("failed durable writes leave task and handoff state unchanged",()=>{
  let reject=false;
  const store=createDepartmentStoreCore(null,()=>{if(reject)throw new Error("Storage unavailable");});
  store.update("sales",d=>d.tasks.push({id:"original",title:"Synthetic original"}));
  reject=true;
  assert.throws(()=>store.update("sales",d=>d.tasks.push({id:"uncommitted"})),/Storage unavailable/);
  assert.equal(store.get("sales").tasks.length,1);
  assert.throws(()=>store.handoff("sales","delivery",{title:"Synthetic handoff",summary:"QA only",owner:"QA",requestId:"failed-id"}),/Storage unavailable/);
  assert.equal(store.get("delivery").tasks.length,0);assert.equal(store.get("sales").events.length,0);
});
