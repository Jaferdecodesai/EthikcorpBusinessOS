import { DurableObject } from "cloudflare:workers";
import { createDepartmentStoreCore, handleDepartmentApi } from "../server/department-core.mjs";
import { ceoDashboard, ceoDepartment } from "../server/ceo-dashboard.mjs";
import { runtimeConfig } from "../server/runtimes.mjs";
import { createSession, readSession, checkApiRequest } from "./session.mjs";
import { handleBrain } from "../server/brain-api.mjs";
import { readInvite, signInvite } from "../server/invites.mjs";

const json = (value, status=200, extra={}) => new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...extra}});
const headers = {
  "X-Content-Type-Options":"nosniff",
  "Referrer-Policy":"strict-origin-when-cross-origin",
  "X-Frame-Options":"DENY",
  "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "Strict-Transport-Security":"max-age=31536000"
};
function secured(response) { const next=new Response(response.body,response);for(const [name,value] of Object.entries(headers))next.headers.set(name,value);return next; }
const localSecret = "local-cloudflare-preview-only-secret-not-for-deployment";
function sessionSecret(request, env) {
  const url=new URL(request.url);
  if(env.SESSION_SECRET?.length>=32)return env.SESSION_SECRET;
  if(url.protocol==="http:"&&["127.0.0.1","localhost"].includes(url.hostname))return localSecret;
  throw new Error("Cloud workspace sessions are not configured.");
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    try {
      if(["/pm","/departments"].includes(url.pathname))return secured(Response.redirect(`${url.origin}/#${url.pathname.slice(1)}`,302));
      if(!url.pathname.startsWith("/api/"))return secured(await env.ASSETS.fetch(request));
      const invalid=checkApiRequest(request);if(invalid)return secured(json({error:invalid.error},invalid.status));
      if(url.pathname==="/api/health")return secured(json({ok:true,product:"Ethikcorp BusinessOS",mode:"cloud-preview",hosting:"cloudflare",storage:"sqlite-durable-object",isolation:"signed-browser-session",githubTokenConfigured:Boolean(env.GITHUB_TOKEN),driveConfigured:Boolean(env.GOOGLE_OAUTH_CLIENT_ID&&env.GOOGLE_OAUTH_CLIENT_SECRET),liveRuntimes:false,llm:"not_configured",region:"cloudflare-global-not-uae",build:env.BUILD_ID||""}));
      const secret=sessionSecret(request,env);
      let session=await readSession(request,secret);
      if(url.pathname==="/api/session"&&request.method==="GET") {
        const fresh=!session;if(fresh)session=await createSession(request,secret);
        return secured(json({ready:true,mode:"cloud-preview",expires:session.expires},200,fresh?{"Set-Cookie":session.cookie}:{}));
      }
      if(!session)return secured(json({error:"Open the app to establish your preview workspace, then retry."},401));
      if(url.pathname.startsWith("/api/brain")){
        const stub=env.PREVIEW_WORKSPACES.get(env.PREVIEW_WORKSPACES.idFromName("ethikcorp-businessllm-v1"));
        if(url.pathname==="/api/brain/claim"){
          const payload=await request.json().catch(()=>({}));
          const invite=await readInvite(secret,payload.invite||"");
          if(!invite)return secured(json({error:"That invite is not valid."},401));
          return secured(await stub.fetch(new Request(request.url,{method:"POST",headers:{"content-type":"application/json","x-brain-session":session.id},body:JSON.stringify({trustedRole:invite.role})})));
        }
        const headers=new Headers(request.headers);
        headers.set("x-brain-session",session.id);
        const proxied=new Request(request,{headers});
        const response=await stub.fetch(proxied);
        if(url.pathname==="/api/brain/bootstrap-dev"&&response.status===200){
          const data=await response.json();
          if(data.claim){const token=await signInvite(secret,"dev");return secured(json({url:`${url.origin}/?invite=${token}#dev`}));}
          return secured(json(data,response.status));
        }
        return secured(response);
      }
      if(url.pathname.startsWith("/api/github/"))return secured(json({error:"GitHub is not connected in this cloud preview. Use the local private-repository connector or export the plan."},503));
      if(url.pathname==="/api/ceo/dashboard")return secured(json(ceoDashboard()));
      const dashboardDept=url.pathname.match(/^\/api\/ceo\/dashboard\/([a-z0-9-]+)$/);
      if(dashboardDept){const report=ceoDepartment(dashboardDept[1]);return secured(json(report||{error:"Unknown department."},report?200:404));}
      if(!(url.pathname.startsWith("/api/departments")||url.pathname==="/api/runtime/status"))return secured(json({error:"Unknown API endpoint."},404));
      const id=env.PREVIEW_WORKSPACES.idFromName(`v1:${session.id}`);
      return secured(await env.PREVIEW_WORKSPACES.get(id).fetch(request));
    } catch { return secured(json({error:"The cloud workspace could not complete this request. Please try again."},503)); }
  }
};

export class PreviewWorkspace extends DurableObject {
  constructor(ctx, env) {
    super(ctx,env);this.sql=ctx.storage.sql;this.queue=Promise.resolve();this.rate={at:Date.now(),count:0};
    this.ready=ctx.blockConcurrencyWhile(async()=>{
      this.sql.exec("CREATE TABLE IF NOT EXISTS workspace_state (id INTEGER PRIMARY KEY CHECK(id = 1), body TEXT NOT NULL)");
      this.sql.exec("CREATE TABLE IF NOT EXISTS brain_state (id INTEGER PRIMARY KEY CHECK(id = 1), body TEXT NOT NULL)");
      const saved=[...this.sql.exec("SELECT body FROM workspace_state WHERE id = 1")][0];
      this.store=createDepartmentStoreCore(saved?JSON.parse(saved.body):null,state=>{
        const body=JSON.stringify(state);
        if(new TextEncoder().encode(body).byteLength>2*1024*1024)throw new Error("Preview storage limit reached. Export your workspace before continuing.");
        this.sql.exec("INSERT INTO workspace_state (id,body) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",body);
      });
    });
  }
  async fetch(request) {
    await this.ready;
    const execute=()=>this.handle(request);
    const response=this.queue.then(execute,execute);this.queue=response.then(()=>{},()=>{});return response;
  }
  loadBrain(){const row=[...this.sql.exec("SELECT body FROM brain_state WHERE id = 1")][0];return row?JSON.parse(row.body):null;}
  saveBrain(brain){const body=JSON.stringify(brain);if(new TextEncoder().encode(body).byteLength>1500000)throw new Error("Brain storage limit reached.");this.sql.exec("INSERT INTO brain_state (id,body) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",body);}
  async handle(request) {
    if(Date.now()-this.rate.at>60000)this.rate={at:Date.now(),count:0};
    if(++this.rate.count>120)return json({error:"Please wait a minute before making more workspace requests."},429,{"Retry-After":"60"});
    const url=new URL(request.url);
    if(url.pathname.startsWith("/api/brain")){
      try{
        const body=request.method==="GET"?{}:await request.json();
        const sessionId=request.headers.get("x-brain-session")||"";
        const stored=this.loadBrain();
        const role=stored?.roles?.[sessionId]||"customer";
        const result=await handleBrain(stored,{method:request.method,pathname:url.pathname,body,role,sessionId,secret:"",connectors:{github:Boolean(this.env.GITHUB_TOKEN),drive:Boolean(this.env.GOOGLE_OAUTH_CLIENT_ID&&this.env.GOOGLE_OAUTH_CLIENT_SECRET)}});
        if(result.brain)this.saveBrain(result.brain);
        return json(result.data,result.status);
      }catch(error){return json({error:error.message||"Brain request failed."},400);}
    }
    try {
      let result;
      await handleDepartmentApi({url:request.url,method:request.method},null,{
        store:this.store,config:runtimeConfig({}),
        readJson:async()=>{
          if(request.method==="GET"||request.method==="HEAD")return {};
          const reader=request.body?.getReader();if(!reader)throw new Error("A JSON body is required.");
          const chunks=[];let size=0;
          while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw new Error("Preview request exceeds 64 KB.");}chunks.push(value);}
          const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
          try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new Error("Invalid JSON request.");}
        },
        json:(_res,status,data)=>{result=json(data,status);}
      });
      return result||json({error:"Unknown workspace endpoint."},404);
    }catch(error){return json({error:error.message||"Workspace request failed."},400);}
  }
}
