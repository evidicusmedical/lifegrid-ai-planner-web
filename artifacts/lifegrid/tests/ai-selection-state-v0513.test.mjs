import test from 'node:test';
import assert from 'node:assert/strict';
import { patchProposalKey } from '../.test-build/lib/aiDependencies.js';
import { getPatchReadiness } from '../.test-build/lib/aiPatchApply.js';
const base={categories:[{id:'other',label:'Other'}],people:[],projects:[],tasks:[],events:[],personEvents:[]};
const patch={warnings:['Advisory only'],categories:{add:[],update:[]},people:{add:[],update:[]},projects:{add:[],update:[]},peopleSchedule:{add:[],update:[]},tasks:{add:[],update:[]},events:{add:[],update:[]}};
for(let i=0;i<20;i++) patch.tasks.add.push({id:`task-${i}`,name:`Task ${i}`,category:'other',status:'todo',priority:'medium',dueDate:null,parentTaskId:null,linkedEventIds:[]});
for(let i=0;i<20;i++) patch.events.add.push({id:`event-${i}`,title:`Event ${i}`,category:'other',date:null,endDate:null,startTime:null,endTime:null,timeStatus:'unknown',linkedTaskIds:[]});
const keys=new Set([...patch.tasks.add.map(r=>patchProposalKey('tasks','add',r.id)),...patch.events.add.map(r=>patchProposalKey('events','add',r.id))]);
test('v0.5.13 canonical selection keeps forty checked proposals ready across recreated selections',()=>{
 assert.equal(keys.size,40); const ready=getPatchReadiness(base,patch,keys); assert.equal(ready.selectedCount,40); assert.equal(ready.canApply,true); assert.equal(ready.warningCount,1);
 const recreated=new Set([...keys]); assert.equal(getPatchReadiness(base,patch,recreated).selectedCount,40);
});
test('canonical composite proposal keys never collide across entity type or operation',()=>{
 assert.notEqual(patchProposalKey('tasks','add','same'),patchProposalKey('events','add','same'));
 assert.notEqual(patchProposalKey('tasks','add','same'),patchProposalKey('tasks','update','same'));
});
test('selection mutations drive count and readiness directly',()=>{
 const one=new Set(keys); one.delete(patchProposalKey('tasks','add','task-0')); assert.equal(getPatchReadiness(base,patch,one).selectedCount,39);
 one.clear(); const empty=getPatchReadiness(base,patch,one); assert.equal(empty.selectedCount,0); assert.match(empty.disabledReason,/Select at least one/);
});
