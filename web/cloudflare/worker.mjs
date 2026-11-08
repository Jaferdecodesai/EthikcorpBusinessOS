import { DurableObject } from "cloudflare:workers";
import { createDepartmentStoreCore, handleDepartmentApi } from "../server/department-core.mjs";
import { runtimeConfig } from "../server/runtimes.mjs";
import { createSession, readSession, checkApiRequest } from "./session.mjs";

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
      if(url.pathname==="/api/health")return secured(json({ok:true,mode:"cloud-preview",hosting:"cloudflare",storage:"sqlite-durable-object",isolation:"signed-browser-session",githubTokenConfigured:false,liveRuntimes:false,build:env.BUILD_ID||""}));
      const secret=sessionSecret(request,env);
      let session=await readSession(request,secret);
      if(url.pathname==="/api/session"&&request.method==="GET") {
        const fresh=!session;if(fresh)session=await createSession(request,secret);
        return secured(json({ready:true,mode:"cloud-preview",expires:session.expires},200,fresh?{"Set-Cookie":session.cookie}:{}));
      }
      if(!session)return secured(json({error:"Open the app to establish your preview workspace, then retry."},401));
      if(url.pathname.startsWith("/api/github/"))return secured(json({error:"GitHub is not connected in this cloud preview. Use the local private-repository connector or export the plan."},503));
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
  async handle(request) {
    if(Date.now()-this.rate.at>60000)this.rate={at:Date.now(),count:0};
    if(++this.rate.count>120)return json({error:"Please wait a minute before making more workspace requests."},429,{"Retry-After":"60"});
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
