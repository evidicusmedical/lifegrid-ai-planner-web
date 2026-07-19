import test from 'node:test'; import assert from 'node:assert/strict';
import { normalizeTypographicJsonDelimiters, parseAIUpdate } from '../.test-build/lib/aiPrompt.js';
import { getPatchReadiness } from '../.test-build/lib/aiPatchApply.js';
const data=()=>({categories:[{id:'other',label:'Other',color:'#666666'}],people:[],projects:[],tasks:[],events:[],personEvents:[],milestones:[]});
const typographic = value => JSON.stringify(value).replaceAll('"','“').replace(/“([^“]*?)“/g,'“$1”');

test('normalizes fully typographic delimiters and preserves JSON values',()=>{
  const small='{“lifegridPatchVersion”:4,“categories”:{“add”:[],“update”:[]}}';
  assert.equal(JSON.parse(normalizeTypographicJsonDelimiters(small)).lifegridPatchVersion,4);
  const supplied='{“lifegridPatchVersion”:4,“categories”:{“add”:[{“id”:“work”,“label”:“Work”,“color”:“#123abc”,“archived”:false,“notes”:null}],“update”:[]}}';
  assert.deepEqual(JSON.parse(normalizeTypographicJsonDelimiters(supplied)),{lifegridPatchVersion:4,categories:{add:[{id:'work',label:'Work',color:'#123abc',archived:false,notes:null}],update:[]}});
});
test('preserves curly apostrophes, prose quotes, and ASCII quotes in typographic strings',()=>{
  const apostrophe=JSON.parse(normalizeTypographicJsonDelimiters('{“notes”:“Jon and Tiffany’s relationship plan”}'));
  assert.equal(apostrophe.notes,'Jon and Tiffany’s relationship plan');
  const prose=JSON.parse(normalizeTypographicJsonDelimiters('{“notes”:“She called it “the plan” before leaving.”}'));
  assert.equal(prose.notes,'She called it “the plan” before leaving.');
  const ascii=JSON.parse(normalizeTypographicJsonDelimiters('{“notes”:“She said "yes" clearly.”}'));
  assert.equal(ascii.notes,'She said "yes" clearly.');
});
test('valid ASCII JSON is parsed unchanged and does not create a normalization warning',()=>{
  const input='{"projects":{"add":[],"update":[]},"notes":["She called it “the plan” before leaving."]}';
  const parsed=parseAIUpdate(input,data().categories,data());
  assert.equal(parsed.patchNotes[0],'She called it “the plan” before leaving.');
  assert.equal(parsed.warnings,undefined);
});
test('typographic v4 fixture reaches existing parsing and preflight unchanged',()=>{
  const fixture={lifegridPatchVersion:4,categories:{add:[{id:'home',label:'Home',color:'#123abc'}],update:[]},projects:{add:[{id:'proj-home',name:'Home plan',color:'#123abc',order:0,aliases:[],status:'active',notes:null}],update:[]},tasks:{add:[{id:'task-parent',name:'Plan living room',category:'home',dueDate:'2026-08-01',status:'todo',owner:null,nextAction:null,notes:'Jon and Tiffany’s plan',priority:'medium',projectId:'proj-home',dueDateType:'target-date',triageStatus:'ready',parentTaskId:null,linkedEventIds:['event-plan']},{id:'task-child',name:'Buy paint',category:'home',dueDate:null,status:'todo',owner:null,nextAction:null,notes:null,priority:'low',projectId:'proj-home',dueDateType:'project-subtask',triageStatus:'ready',parentTaskId:'task-parent',linkedEventIds:[]}],update:[]},events:{add:[{id:'event-plan',date:'2026-08-01',endDate:'2026-08-01',title:'Planning session',category:'home',timeStatus:'all-day',startTime:null,endTime:null,color:'#123abc',notes:null,displayPriority:2,showInGrid:true,showInExport:true,eventKind:'reminder',linkedTaskIds:['task-parent'],aiNotes:null,sourceNotes:null,recurringGroupId:'home-series'}],update:[]},people:{add:[],update:[]},peopleSchedule:{add:[],update:[]},warnings:['Review timing']};
  const parsed=parseAIUpdate(typographic(fixture),data().categories,data());
  assert.equal(parsed.tasks.add[1].parentTaskId,'task-parent'); assert.deepEqual(parsed.events.add[0].linkedTaskIds,['task-parent']); assert.equal(parsed.events.add[0].recurringGroupId,'home-series');
  assert.ok(parsed.warnings.some(w=>w.includes('normalized'))); assert.equal(getPatchReadiness(data(),parsed).blockingCount,0);
});
test('malformed typographic JSON remains blocked while placeholder and envelope checks remain active',()=>{
  assert.throws(()=>parseAIUpdate('{“projects”:{“add”:[],“update”:[],}',data().categories,data()),/could not be safely normalized/);
  assert.throws(()=>parseAIUpdate('PASTE_ALL_OF_YOUR_EXISTING_TASK_OBJECTS_HERE',data().categories,data()),/placeholder/);
  assert.throws(()=>parseAIUpdate('{“lifegridPatchVersion”:4,“categories”:{“add”:[],“update”:[]}}',data().categories,data()),/doesn.t contain/);
});
