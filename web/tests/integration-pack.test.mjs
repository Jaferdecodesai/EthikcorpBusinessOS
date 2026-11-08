import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { departments } from "../server/departments.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
test("all nineteen Sim starter functions execute their documented local contract",()=>{for(const d of departments)for(const w of d.workflows){const state=JSON.parse(fs.readFileSync(path.join(root,`integrations/sim/workflows/${w.id}.json`),"utf8"));assert.equal(state.blocks.start.type,"start_trigger");assert.equal(state.edges[0].target,"prepare");const code=state.blocks.prepare.subBlocks.code.value.replace(/<start\.([A-Za-z]+)>/g,"input.$1");const run=new Function("input",code);const result=run({objective:"Synthetic contract test",sourceRefs:"QA-v1",reviewer:"QA"});assert.equal(result.workflow,w.id);assert.equal(result.department,d.id);assert.equal(result.reviewRequired,true);assert.equal(result.engine,"structured-template");assert.equal(result.sourceRefs,"QA-v1");assert.throws(()=>run({objective:""}),/required/);}});
