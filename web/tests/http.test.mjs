import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("HTTP workspace flow persists task, draft, review, memory and handoff",async t=>{
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const dir=mkdtempSync(path.join(tmpdir(),"ethikcorp-http-"));
  const child=spawn(process.execPath,["server/index.mjs"],{cwd:root,env:{...process.env,PORT:"0",NODE_ENV:"production",DEPARTMENT_STORE_PATH:path.join(dir,"state.json"),RUNTIME_EGRESS_APPROVED:"false"},stdio:["ignore","pipe","pipe"]});
  t.after(async()=>{if(child.exitCode===null){child.kill();await new Promise(resolve=>child.once("exit",resolve));}rmSync(dir,{recursive:true,force:true});});
  const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("Server did not start")),10000);child.stdout.on("data",chunk=>{const match=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once("error",reject);});
  const request=async(route,method="GET",body)=>{const response=await fetch(base+route,{method,headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;};
  const all=await request("/api/departments");assert.equal(all.departments.length,9);
  for(const d of all.departments){const data=await request(`/api/departments/${d.id}`);assert.equal(data.definition.id,d.id);assert.equal(data.tasks.length,0);}
  const task=await request("/api/departments/sales/tasks","POST",{title:"Synthetic proposal task",owner:"QA"});await request(`/api/departments/sales/tasks/${task.id}`,"PATCH",{status:"in_progress"});
  const cross=await fetch(base+`/api/departments/finance/tasks/${task.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:'{"status":"done"}'});assert.equal(cross.status,400);
  const runData=await request("/api/departments/sales/runs","POST",{workflowId:"sales-proposal",objective:"Synthetic QA proposal",reviewer:"QA",sourceRefs:"QA-doc-v1"});const run=runData.runs[0];assert.equal(run.status,"pending_review");
  const reviewed=await request(`/api/departments/sales/runs/${run.id}/review`,"POST",{decision:"approve",reviewer:"QA",note:"Synthetic evidence checked",outputHash:run.outputHash});assert.equal(reviewed.runs[0].status,"approved");
  await request("/api/departments/sales/memory","POST",{title:"QA rule",content:"Synthetic fact",sourceRef:"QA-DEC-1",owner:"QA"});
  await request("/api/departments/sales/handoffs","POST",{target:"delivery",title:"QA handoff",summary:"Approved synthetic summary",owner:"QA",requestId:"qa-handoff"});assert.equal((await request("/api/departments/delivery")).tasks.length,1);
  const chat=await request("/api/departments/sales/messages","POST",{text:"Review current priorities",mode:"local"});assert.equal(chat.messages.length,2);assert.ok(chat.messages[1].text.includes("1 open tasks"));
  const invalidOrigin=await fetch(base+"/api/departments",{headers:{Origin:"https://untrusted.example"}});assert.equal(invalidOrigin.status,403);
  const pack=await fetch(base+"/integrations/ethikcorp-runtime-starter.zip");assert.equal(pack.status,200);assert.ok((await pack.arrayBuffer()).byteLength>1000);
});
