import { randomUUID, createHash } from "node:crypto";
import catalog from "../shared/departments.json" with { type: "json" };
import { executeSim, pollSim, sendLobu, runtimeStatus } from "./runtimes.mjs";

export const departments = catalog;
const id = () => randomUUID();
const now = () => new Date().toISOString();
const hash = (text) => createHash("sha256").update(text).digest("hex");
export function required(value, name, max = 500) { if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${name} is required and must be at most ${max} characters.`); return value.trim(); }
const optional = (v, max = 2000) => typeof v === "string" ? v.trim().slice(0, max) : "";
function dateOnly(value) { const date=optional(value,100);if(!date)return "";if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error("Invalid due date.");return date; }

const emptyDepartment = () => ({ settings: { owner: "", paused: false }, tasks: [], runs: [], automations: [], memory: [], messages: [], events: [] });

export function createDepartmentStoreCore(initialState, save) {
  let state = structuredClone(initialState || { version: 1, departments: {} });
  for (const department of departments) if (!state.departments[department.id]) state.departments[department.id] = emptyDepartment();
  for (const data of Object.values(state.departments)) for (const run of data.runs || []) if (run.status === "running") { run.status = "interrupted"; run.error = "The server restarted before a final receipt was saved. Reconcile the original run ID in the configured runtime before retrying."; }
  const get = (slug) => { if (!departments.some((d) => d.id === slug)) throw new Error("Department not found."); return state.departments[slug]; };
  const commit = (next) => { save(next); state = next; };
  return {
    reset: () => commit({ version: 1, departments: Object.fromEntries(departments.map(({ id: key }) => [key, emptyDepartment()])) }),
    get: (slug) => structuredClone(get(slug)),
    update(slug, fn, event) {
      const draft = structuredClone(get(slug)); const result = fn(draft);
      if (event) draft.events.unshift({ id: id(), at: now(), ...event });
      commit({ ...state, departments: { ...state.departments, [slug]: draft } });
      return result;
    },
    handoff(slug, target, body) {
      const definition = departments.find((d) => d.id === slug); if (!definition?.partners.includes(target)) throw new Error("Destination is not an authorised partner in this workspace.");
      const title = required(body.title, "Handoff title", 200); const summary = required(body.summary, "Handoff summary", 4000); const owner = required(body.owner, "Handoff requester", 120);
      const key = required(body.requestId, "Handoff request ID", 100); const previous = get(slug).events.find((e) => e.requestId === key); if (previous) return { taskId: previous.taskId, duplicate: true };
      const source = structuredClone(get(slug)), destination = structuredClone(get(target));
      const task = { id: id(), title, notes: summary, owner: "", dueDate: "", priority: "normal", status: "todo", createdAt: now(), fromDepartment: slug, requester: owner };
      destination.tasks.unshift(task);
      const event = { id: id(), at: now(), kind: "handoff", title: `Handoff to ${target}: ${title}`, requestId: key, taskId: task.id, target, owner };
      source.events.unshift(event); destination.events.unshift({ ...event, id: id(), title: `Handoff from ${slug}: ${title}` });
      commit({ ...state, departments: { ...state.departments, [slug]: source, [target]: destination } });
      return { taskId: task.id };
    }
  };
}

export function localDraft(definition, workflow, input) {
  const request = required(input.objective, workflow.inputLabel, 6000);
  const evidence = optional(input.sourceRefs, 2000);
  const retrieved = optional(input.releaseRefs, 2000);
  return `# ${workflow.name}\n\nPrepared for ${definition.name}. Local structured draft for review.\n\n## Supplied brief\n${request}\n\n## Supplied source references\n${evidence || "No references supplied."}${retrieved ? `\n\n## BusinessBrain citations\n${retrieved}` : ""}\n\n${workflow.sections.map((section) => `## ${section}\n[Reviewer to complete from the supplied brief and approved evidence.]`).join("\n\n")}\n\n## Release check\nNamed reviewer: ${optional(input.reviewer, 120) || "Not assigned"}. Verify facts, source rights and current versions. External action requires a separate approved execution route.`;
}
export function localLead(definition, data, prompt) {
  const open = data.tasks.filter((t) => t.status !== "done"); const blocked = open.filter((t) => t.status === "blocked"); const reviews = data.runs.filter((r) => r.status === "pending_review");
  return `Local workspace plan for ${definition.name}\n\nRequest recorded: ${prompt}\n\n${definition.focus}\n\nCurrent records: ${open.length} open tasks, ${blocked.length} blocked, ${reviews.length} drafts awaiting review, ${data.memory.filter((m) => m.active).length} active memory notes.\n\nNext actions\n${!data.settings.owner ? "- Name the department lead.\n" : ""}${open.slice(0,3).map((t) => `- ${t.title} — ${t.owner || "assign an owner"}${t.dueDate ? `; due ${t.dueDate}` : "; set a due date"}.`).join("\n") || "- Add a work item or use a starter task."}\n${reviews.length ? "- Review the pending workflow drafts before using their content.\n" : ""}\nThis plan is generated from local records using rules. Select Lobu when the approved persistent specialist is configured.`;
}

export async function handleDepartmentApi(req, res, { store, config, readJson, json, resolveEvidence, canValidate = false, actor = "Local operator" }) {
  const url = new URL(req.url, "http://localhost");
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.pathname === "/api/runtime/status" && req.method === "GET") return json(res, 200, runtimeStatus(config));
  if (url.pathname === "/api/departments" && req.method === "GET") return json(res, 200, { departments: departments.map((d) => { const data = store.get(d.id); return { ...d, settings: data.settings, stats: { open: data.tasks.filter((t) => t.status !== "done").length, blocked: data.tasks.filter((t) => t.status === "blocked").length, reviews: data.runs.filter((r) => r.status === "pending_review").length, runs: data.runs.length, memory: data.memory.filter((m) => m.active).length } }; }) });
  const slug = segments[2]; const definition = departments.find((d) => d.id === slug); if (!definition) return json(res, 404, { error: "Department not found." });
  const data = store.get(slug);
  if (segments.length === 3 && req.method === "GET") return json(res, 200, { definition, ...data });
  if (segments[3] === "export" && req.method === "GET") return json(res, 200, { exportedAt: now(), definition, ...data });
  const body = await readJson(req);
  if (segments[3] === "automations" && segments.length === 4 && req.method === "POST") {
    const name = required(body.name, "Automation name", 120);
    const trigger = required(body.trigger, "Trigger", 240);
    const steps = required(body.steps, "Automation steps", 4000).split(/\r?\n/).map((step) => step.trim()).filter(Boolean);
    if (steps.length > 12 || steps.some((step) => step.length > 300)) throw new Error("Enter up to 12 steps, each at most 300 characters.");
    const automation = { id: id(), name, trigger, steps, createdAt: now(), createdBy: actor, status: "pending_review", hash: hash(JSON.stringify([name, trigger, steps])) };
    store.update(slug, (draft) => { draft.automations ||= []; draft.automations.unshift(automation); }, { kind: "automation", title: `Proposed ${name}` });
    return json(res, 201, automation);
  }
  if (segments[3] === "automations" && segments[5] === "review" && segments.length === 6 && req.method === "POST") {
    if (!canValidate) return json(res, 403, { error: "Only the CEO can validate an automation." });
    if (!["approve", "reject"].includes(body.decision)) throw new Error("Choose approve or reject.");
    const note = required(body.note, "Review note", 2000);
    store.update(slug, (draft) => {
      const automation = (draft.automations || []).find(({ id }) => id === segments[4]);
      if (!automation || automation.status !== "pending_review" || body.hash !== automation.hash) throw new Error("This automation changed or has already been reviewed.");
      automation.status = body.decision === "approve" ? "approved" : "rejected";
      automation.review = { reviewer: actor, note, at: now(), hash: automation.hash };
    }, { kind: "automation", title: `Automation review by ${actor}` });
    return json(res, 200, store.get(slug));
  }
  if (segments[3] === "settings" && req.method === "PATCH") {
    store.update(slug, (draft) => { draft.settings = { owner: optional(body.owner, 120), paused: Boolean(body.paused) }; }, { kind: "settings", title: "Department lead settings updated" }); return json(res, 200, store.get(slug));
  }
  if (segments[3] === "tasks" && req.method === "POST") {
    const task = { id: id(), title: required(body.title, "Task title", 200), owner: optional(body.owner,120), dueDate: dateOnly(body.dueDate), notes: optional(body.notes,4000), priority: ["normal","high"].includes(body.priority) ? body.priority : "normal", status: "todo", createdAt: now() };
    if (task.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) throw new Error("Invalid due date.");
    store.update(slug,(draft)=>draft.tasks.unshift(task),{kind:"task",title:`Task created: ${task.title}`}); return json(res,201,task);
  }
  if (segments[3] === "tasks" && req.method === "PATCH") {
    const taskId = segments[4];
    store.update(slug,(draft)=>{
      const task=draft.tasks.find((t)=>t.id===taskId);
      if(!task)throw new Error("Task not found in this department.");
      if(body.status){if(!["todo","in_progress","blocked","done"].includes(body.status))throw new Error("Invalid task status.");task.status=body.status;}
      if(typeof body.owner==="string")task.owner=optional(body.owner,120);
      if(typeof body.dueDate==="string")task.dueDate=dateOnly(body.dueDate);
      task.updatedAt=now();
    },{kind:"task",title:"Work item updated",taskId});
    return json(res,200,store.get(slug));
  }
  if (segments[3] === "memory" && req.method === "POST") {
    const note={id:id(),title:required(body.title,"Memory title",200),content:required(body.content,"Memory content",5000),sourceRef:required(body.sourceRef,"Memory provenance",1000),owner:required(body.owner,"Memory reviewer",120),active:true,createdAt:now()};
    store.update(slug,(draft)=>{if(body.supersedes){const prior=draft.memory.find((m)=>m.id===body.supersedes);if(!prior)throw new Error("Memory note not found in this department.");prior.active=false;note.supersedes=prior.id;}draft.memory.unshift(note);},{kind:"memory",title:`Memory recorded: ${note.title}`});return json(res,201,note);
  }
  if (segments[3] === "memory" && req.method === "PATCH") {
    store.update(slug,(draft)=>{const item=draft.memory.find((m)=>m.id===segments[4]);if(!item)throw new Error("Memory note not found.");item.active=false;item.retiredAt=now();},{kind:"memory",title:"Memory note retired"});return json(res,200,store.get(slug));
  }
  if (segments[3] === "handoffs" && req.method === "POST") return json(res,201,store.handoff(slug,body.target,body));
  if (segments[3] === "messages" && req.method === "POST") {
    if(data.settings.paused)throw new Error("The department lead is paused.");const prompt=required(body.text,"Message",4000);const mode=body.mode==="lobu"?"lobu":"local";const requestId=id();
    store.update(slug,(draft)=>draft.messages.push({id:requestId,role:"user",text:prompt,mode,at:now()}),{kind:"lead",title:`Lead request recorded (${mode})`});
    let reply;
    try { reply=mode==="lobu"?await sendLobu(config,slug,prompt,requestId):{status:"completed",text:localLead(definition,store.get(slug),prompt)}; }
    catch(error){reply={status:"failed",text:error.message};}
    store.update(slug,(draft)=>draft.messages.push({id:id(),role:"assistant",...reply,mode,at:now()}),{kind:"lead",title:`Lead response: ${reply.status}`});return json(res,200,store.get(slug));
  }
  if(segments[3]==="runs"&&segments.length===4&&req.method==="POST"){
    if(data.settings.paused)throw new Error("The department lead is paused.");
    const custom = (data.automations || []).find((item) => item.id === body.workflowId && item.status === "approved");
    const workflow = definition.workflows.find((item) => item.id === body.workflowId) || (custom && { id: custom.id, name: custom.name, inputLabel: "Workflow brief", sections: custom.steps });
    if (!workflow) throw new Error("Choose an approved automation or department template.");
    const objective=required(body.objective,"Workflow brief",6000);const mode=!custom&&body.mode==="sim"?"sim":"local";
    const run={id:id(),workflowId:workflow.id,name:workflow.name,mode,status:"running",input:{objective,sourceRefs:optional(body.sourceRefs,2000),reviewer:optional(body.reviewer,120)},createdAt:now()};
    if(mode==="sim"&&typeof config.simMap[workflow.id]==="string")Object.assign(run,{remoteWorkflowId:config.simMap[workflow.id],remoteRunId:run.id});
    store.update(slug,(draft)=>draft.runs.unshift(run),{kind:"workflow",title:`Started ${workflow.name}`,runId:run.id});
    let result;try{if(mode==="local")result={status:"pending_review",output:localDraft(definition,workflow,{...run.input,releaseRefs:resolveEvidence?.(slug,objective)})};else {const receipt=await executeSim(config,workflow.id,{...run.input,department:slug},run.id);result={...receipt,status:receipt.remoteStatus==="completed"?"pending_review":receipt.remoteStatus==="failed"?"failed":"queued",output:receipt.output?JSON.stringify(receipt.output,null,2):""};}}catch(error){result={status:error.uncertain?"needs_reconciliation":"failed",error:error.message,output:""};}
    store.update(slug,(draft)=>Object.assign(draft.runs.find((r)=>r.id===run.id),result,{outputHash:hash(result.output||""),updatedAt:now()}),{kind:"workflow",title:`${workflow.name}: ${result.status}`,runId:run.id});return json(res,201,store.get(slug));
  }
  if(segments[3]==="runs"&&segments[5]==="refresh"&&req.method==="POST"){
    const run=data.runs.find((r)=>r.id===segments[4]);if(!run||run.mode!=="sim"||!run.remoteRunId||!run.remoteWorkflowId)throw new Error("Sim run receipt not found.");if(!["queued","needs_reconciliation","interrupted"].includes(run.status))return json(res,200,data);
    const receipt=await pollSim(config,run);if(!receipt||!receipt.status)throw new Error("Sim returned no run status.");const output=receipt.output?JSON.stringify(receipt.output,null,2):"";
    store.update(slug,(draft)=>Object.assign(draft.runs.find((r)=>r.id===run.id),{remoteStatus:receipt.status,status:receipt.status==="completed"?"pending_review":["failed","cancelled"].includes(receipt.status)?"failed":"queued",output,outputHash:hash(output),error:receipt.error||null,updatedAt:now()}),{kind:"workflow",title:`Sim run reconciled: ${receipt.status}`,runId:run.id});return json(res,200,store.get(slug));
  }
  if(segments[3]==="runs"&&segments[5]==="review"&&req.method==="POST"){
    const reviewer=required(body.reviewer,"Reviewer",120);if(!["approve","reject"].includes(body.decision))throw new Error("Review decision is required.");const note=required(body.note,"Review note",2000);
    store.update(slug,(draft)=>{
      const run=draft.runs.find((r)=>r.id===segments[4]);
      if(!run)throw new Error("Run not found in this department.");
      if(run.status!=="pending_review")throw new Error("Only an unreviewed completed draft can be reviewed.");
      if(!run.output?.trim())throw new Error("No usable output is available to review.");
      if(body.outputHash!==run.outputHash)throw new Error("Output changed. Reload before reviewing.");
      run.status=body.decision==="approve"?"approved":"rejected";
      run.review={reviewer,note,decision:body.decision,outputHash:run.outputHash,at:now()};
    },{kind:"review",title:`Draft ${body.decision==="approve"?"approved":"rejected"} by ${reviewer}`,runId:segments[4]});
    return json(res,200,store.get(slug));
  }
  return json(res,404,{error:"Department endpoint not found."});
}
