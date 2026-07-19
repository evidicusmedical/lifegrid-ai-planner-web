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
test('normalizes the production asymmetric U+201D color delimiter pattern',()=>{
  const production='{“lifegridPatchVersion”:4,“categories”:{“add”:[{“id”:“relationship”,“label”:“Relationship / Wife”,“color”:”#8b5cf6”}],“update”:[]}}';
  const parsed=JSON.parse(normalizeTypographicJsonDelimiters(production));
  assert.equal(parsed.categories.add[0].color,'#8b5cf6');
  const reviewed=parseAIUpdate(production.slice(0,-1)+',“projects”:{“add”:[],“update”:[]}}',data().categories,data());
  assert.equal(reviewed.categories.add[0].color,'#8b5cf6');
  assert.ok(reviewed.warnings.some(w=>w.includes('normalized')));
  assert.equal(getPatchReadiness(data(),reviewed).blockingCount,0);
});
test('accepts every structural typographic delimiter pairing and legal terminator',()=>{
  for (const [source, expected] of [['{“id”:“one”}','one'],['{”id”:”two”}','two'],['{“id”:“three“}','three'],['{”id”:”four“}','four']]) assert.equal(JSON.parse(normalizeTypographicJsonDelimiters(source)).id,expected);
  for (const source of ['{”key”:”value”}','[”value”]','”value”']) assert.doesNotThrow(()=>JSON.parse(normalizeTypographicJsonDelimiters(source)));
  assert.equal(JSON.parse(normalizeTypographicJsonDelimiters('{“id”:”relationship”,“label”:“Relationship / Wife”,“color”:”#8b5cf6”}')).color,'#8b5cf6');
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
test('realistic asymmetric fixture preserves linked records, dates, warnings, and apostrophes',()=>{
  const fixture='{”lifegridPatchVersion”:4,”categories”:{”add”:[{”id”:”relationship”,”label”:”Relationship / Wife”,”color”:”#8b5cf6”},{”id”:”usaf-service-planning”,”label”:”USAF Service Planning”,”color”:”#2563eb”}],”update”:[]},”projects”:{”add”:[{”id”:”project-relationship”,”name”:”Relationship plan”,”color”:”#8b5cf6”,”order”:0,”aliases”:[],”status”:”active”,”notes”:”Jon and Tiffany’s planning”}],”update”:[],”delete”:[]},”tasks”:{”add”:[{”id”:”task-parent”,”name”:”Plan relationship”,”category”:”relationship”,”dueDate”:”2026-08-01”,”status”:”todo”,”owner”:null,”nextAction”:null,”notes”:”Wife’s preferences”,”priority”:”medium”,”projectId”:”project-relationship”,”dueDateType”:”target-date”,”triageStatus”:”ready”,”parentTaskId”:null,”linkedEventIds”:[”event-plan”]},{”id”:”task-child”,”name”:”Schedule review”,”category”:”usaf-service-planning”,”dueDate”:null,”status”:”todo”,”owner”:null,”nextAction”:null,”notes”:null,”priority”:”low”,”projectId”:”project-relationship”,”dueDateType”:”project-subtask”,”triageStatus”:”ready”,”parentTaskId”:”task-parent”,”linkedEventIds”:[]}],”update”:[],”delete”:[]},”events”:{”add”:[{”id”:”event-plan”,”date”:”2026-08-01”,”endDate”:”2026-08-01”,”title”:”Planning review”,”category”:”relationship”,”timeStatus”:”all-day”,”startTime”:null,”endTime”:null,”color”:”#8b5cf6”,”notes”:null,”displayPriority”:2,”showInGrid”:true,”showInExport”:true,”eventKind”:”reminder”,”linkedTaskIds”:[”task-parent”],”aiNotes”:null,”sourceNotes”:null,”recurringGroupId”:”relationship-series”}],”update”:[],”delete”:[]},”warnings”:[”Review Jon’s schedule”]}';
  const parsed=parseAIUpdate(fixture,data().categories,data());
  assert.equal(parsed.categories.add[1].color,'#2563eb'); assert.equal(parsed.tasks.add[1].parentTaskId,'task-parent'); assert.equal(parsed.events.add[0].endDate,'2026-08-01'); assert.equal(parsed.events.add[0].recurringGroupId,'relationship-series'); assert.deepEqual(parsed.events.add[0].linkedTaskIds,['task-parent']); assert.ok(parsed.warnings.some(w=>w.includes('Jon’s')));
});
test('malformed typographic JSON remains blocked while placeholder and envelope checks remain active',()=>{
  assert.throws(()=>parseAIUpdate('{“projects”:{“add”:[],“update”:[],}',data().categories,data()),/normalization still produced invalid JSON.*No changes were applied/);
  assert.throws(()=>parseAIUpdate('PASTE_ALL_OF_YOUR_EXISTING_TASK_OBJECTS_HERE',data().categories,data()),/placeholder/);
  assert.throws(()=>parseAIUpdate('{“lifegridPatchVersion”:4,“categories”:{“add”:[],“update”:[]}}',data().categories,data()),/doesn.t contain/);
});
