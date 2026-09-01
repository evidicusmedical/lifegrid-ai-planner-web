import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CORE_COLOR_FAMILIES, CORE_COLOR_PALETTE, normalizedPaletteIsUnique, paletteFamiliesAreDistinct, paletteWithCurrentColor } from '../.test-build/lib/palette.js';
import { applyRecurringNotesEdit, normalizeAllDayOccurrenceRange, isNotesOnlyRecurrenceEdit, repeatedAllDayOccurrenceRange, repeatedOccurrenceRange, resolveAllDayEditRange } from '../.test-build/lib/recurrenceEdit.js';
import { temporalErrors } from '../.test-build/lib/temporal.js';
import { TASK_SORT_DESCRIPTIONS, clearTaskDueDate, priorityRank, sortTasks, statusRank } from '../.test-build/lib/taskWorkflow.js';
import { normalizeEntityOrder, moveOrderedEntity } from '../.test-build/lib/entityOrder.js';
import { parseAIUpdate } from '../.test-build/lib/aiPrompt.js';
const task = (id, overrides={}) => ({ id, name:id, category:'work', dueDate:null, status:'todo', owner:'Me', nextAction:null, notes:null, priority:'medium', dueDateType:'target-date', triageStatus:'ready', parentTaskId:null, linkedEventIds:[], ...overrides });
const event = (overrides={}) => ({id:'e',date:'2026-07-01',endDate:'2026-07-01',timeStatus:'all-day',timeZone:null,timeZoneMode:null,title:'Round',category:'work',startTime:null,endTime:null,color:'#123456',notes:null,displayPriority:4,showInGrid:true,showInExport:true,linkedTaskIds:[],aiNotes:null,sourceNotes:null,...overrides});
test('task sort contract is deterministic and undated dates sort last', () => {
 assert.equal(statusRank('todo'),0); assert.equal(statusRank('in-progress'),1); assert.equal(statusRank('blocked'),2); assert.equal(statusRank('done'),3);
 assert.deepEqual(['urgent','high','medium','low',null].map(priorityRank),[0,1,2,3,4]);
 const tasks=[task('none',{priority:'urgent'}),task('late',{dueDate:'2026-08-01'}),task('early',{dueDate:'2026-07-01'}),task('blocked',{status:'blocked',priority:'medium'})];
 assert.deepEqual(sortTasks(tasks,'due-asc',[],'2026-06-01').map(x=>x.id),['early','late','blocked','none']);
 assert.deepEqual(sortTasks(tasks,'due-desc',[],'2026-06-01').map(x=>x.id),['late','early','blocked','none']);
 const smart = sortTasks([
   task('far-medium',{dueDate:'2027-06-01',priority:'medium'}),
   task('ordinary-low',{dueDate:null,priority:'low'}),
   task('blocked-undated',{status:'blocked',priority:'medium'}),
   task('urgent-undated',{priority:'urgent'}),
 ],'smart',[],'2026-06-01').map(x=>x.id);
 assert.deepEqual(smart.slice(0,2),['urgent-undated','blocked-undated']);
 assert.ok(smart.indexOf('blocked-undated') < smart.indexOf('far-medium'));
 assert.equal(Object.keys(TASK_SORT_DESCRIPTIONS).length,8);
});
test('due date clear is canonical and preserves unrelated fields',()=>{const before=task('x',{dueDate:'2026-08-01',status:'blocked',parentTaskId:'p'});const after=clearTaskDueDate(before);assert.equal(after.dueDate,null);assert.equal(after.status,'blocked');assert.equal(after.parentTaskId,'p');assert.equal(JSON.parse(JSON.stringify(after)).dueDate,null)});
test('all-day occurrence ranges use inclusive local date duration safely',()=>{assert.deepEqual(normalizeAllDayOccurrenceRange('2026-08-10','2026-07-01','2026-07-01'),{date:'2026-08-10',endDate:'2026-08-10'});assert.deepEqual(normalizeAllDayOccurrenceRange('2026-08-10','2026-07-01','2026-07-03'),{date:'2026-08-10',endDate:'2026-08-12'});assert.equal(normalizeAllDayOccurrenceRange('2026-08-10','2026-07-02',null).endDate,'2026-08-10');assert.equal(normalizeAllDayOccurrenceRange('2026-08-10','2026-07-02','2026-07-01').endDate,'2026-08-10')});
test('later repeated all-day occurrences receive their own valid one-day and multiday ranges',()=>{
 assert.deepEqual(repeatedAllDayOccurrenceRange('2026-07-08','2026-07-01','2026-07-01'),{date:'2026-07-08',endDate:'2026-07-08'});
 assert.deepEqual(repeatedAllDayOccurrenceRange('2026-07-15','2026-07-01','2026-07-03'),{date:'2026-07-15',endDate:'2026-07-17'});
});
test('all-day edits honor explicit end dates and preserve duration only for untouched date moves',()=>{
 const initial={date:'2026-07-01',endDate:'2026-07-03'};
 assert.deepEqual(resolveAllDayEditRange('2026-07-01','2026-07-01',{date:'2026-07-01',endDate:'2026-07-01'},false),{date:'2026-07-01',endDate:'2026-07-01'});
 assert.deepEqual(resolveAllDayEditRange('2026-07-01','2026-07-03',initial,false),{date:'2026-07-01',endDate:'2026-07-03'});
 assert.deepEqual(resolveAllDayEditRange('2026-07-10','2026-07-01',{date:'2026-07-10',endDate:'2026-07-01'},false),{date:'2026-07-10',endDate:'2026-07-10'});
 assert.deepEqual(resolveAllDayEditRange('2026-07-10',null,{date:'2026-07-10',endDate:null},false),{date:'2026-07-10',endDate:'2026-07-10'});
 assert.deepEqual(resolveAllDayEditRange('2026-07-01','2026-07-05',initial,true),{date:'2026-07-01',endDate:'2026-07-05'});
 assert.deepEqual(resolveAllDayEditRange('2026-08-01','2026-08-04',initial,true),{date:'2026-08-01',endDate:'2026-08-04'});
 assert.deepEqual(resolveAllDayEditRange('2026-08-01','2026-07-03',initial,false),{date:'2026-08-01',endDate:'2026-08-03'});
 const explicitInvalid=resolveAllDayEditRange('2026-08-01','2026-07-31',initial,true);
 assert.deepEqual(explicitInvalid,{date:'2026-08-01',endDate:'2026-07-31'});
 assert.deepEqual(temporalErrors({...explicitInvalid,timeStatus:'all-day',startTime:null,endTime:null}),['End date cannot precede start date.']);
});
test('shared repeat range preserves timed and approximate calendar spans for weekly and monthly occurrences',()=>{
 const cases=[
  { timeStatus:'timed', occurrenceDate:'2026-07-08', firstEndDate:'2026-07-01', startTime:'09:00', endTime:'10:00', expectedEnd:'2026-07-08' },
  { timeStatus:'timed', occurrenceDate:'2026-07-08', firstEndDate:'2026-07-02', startTime:'22:00', endTime:'06:00', expectedEnd:'2026-07-09' },
  { timeStatus:'approximate', occurrenceDate:'2026-08-01', firstEndDate:'2026-07-02', startTime:'14:00', endTime:'15:00', expectedEnd:'2026-08-02' },
 ];
 for (const value of cases) {
  const range=repeatedOccurrenceRange(value.occurrenceDate,'2026-07-01',value.firstEndDate);
  assert.equal(range.endDate,value.expectedEnd);
  assert.deepEqual(temporalErrors({...range,timeStatus:value.timeStatus,startTime:value.startTime,endTime:value.endTime}),[]);
 }
});
test('notes-only recurrence edits are detected by field diff',()=>{const before=event();assert.equal(isNotesOnlyRecurrenceEdit(before,{notes:'updated'}),true);assert.equal(isNotesOnlyRecurrenceEdit(before,{notes:'updated',date:'2026-07-02'}),false)});
test('notes-only recurrence scope updates every sibling or only the selected event',()=>{
 const siblings=[event({id:'a',recurringGroupId:'g'}),event({id:'b',recurringGroupId:'g'}),event({id:'c',recurringGroupId:'other'})];
 const all=applyRecurringNotesEdit(siblings,siblings[0],{notes:'all',aiNotes:'ai',sourceNotes:'source'},'entire-series');
 assert.deepEqual(all.map(x=>x.notes),['all','all',null]);
 const one=applyRecurringNotesEdit(siblings,siblings[0],{notes:'one',aiNotes:null,sourceNotes:null},'this-event');
 assert.deepEqual(one.map(x=>x.notes),['one',null,null]);
 const stale=[event({id:'stale',date:'2026-07-08',endDate:'2026-07-01',recurringGroupId:'stale-group'}),event({id:'valid',date:'2026-07-15',endDate:'2026-07-15',recurringGroupId:'stale-group'})];
 const repaired=applyRecurringNotesEdit(stale,stale[0],{notes:'repair',aiNotes:null,sourceNotes:null},'entire-series');
 assert.equal(repaired[0].endDate,'2026-07-08'); assert.deepEqual(repaired.map(x=>x.notes),['repair','repair']);
});
test('AI parser enforces blocked status, preserves combined triage, and merges update plus delete',()=>{
 const existing={categories:[{id:'other',label:'Other',color:'#475569'}],people:[],projects:[],events:[],personEvents:[],milestones:[],tasks:[task('t',{category:'other'})]};
 const triageOnly=parseAIUpdate(JSON.stringify({lifegridPatchVersion:4,tasks:{update:[{id:'t',triageStatus:'blocked'}]}}),existing.categories,existing);
 assert.deepEqual(triageOnly.tasks.update[0],{id:'t',triageStatus:'blocked',status:'blocked'});
 const combined=parseAIUpdate(JSON.stringify({lifegridPatchVersion:4,tasks:{update:[{id:'t',status:'blocked',triageStatus:'waiting'}]}}),existing.categories,existing);
 assert.equal(combined.tasks.update[0].status,'blocked'); assert.equal(combined.tasks.update[0].triageStatus,'waiting');
 const deletion=parseAIUpdate(JSON.stringify({lifegridPatchVersion:4,tasks:{update:[{id:'t',notes:'retain me'}],delete:['t']}}),existing.categories,existing);
 assert.deepEqual(deletion.tasks.delete,['t']); assert.equal(deletion.tasks.update[0].notes,'retain me');
});
test('Project and People ordering helpers persist deterministically through JSON',()=>{
 const legacy=[{id:'a'},{id:'b',order:0},{id:'c'}];
 const ordered=normalizeEntityOrder(legacy); const moved=moveOrderedEntity(ordered,2,0);
 assert.deepEqual(JSON.parse(JSON.stringify(moved)).map(x=>[x.id,x.order]),[['c',0],['b',1],['a',2]]);
});
test('shared palette has 16 reviewed color families and retains arbitrary current colors',()=>{assert.equal(CORE_COLOR_PALETTE.length,32);assert.equal(CORE_COLOR_FAMILIES.length,32);assert.equal(normalizedPaletteIsUnique(),true);assert.equal(paletteFamiliesAreDistinct(),true);assert.equal(paletteWithCurrentColor('#123456')[0],'#123456')});
test('corrected UI contracts and release markers are exposed',()=>{
 const settings=readFileSync(new URL('../src/pages/SettingsView.tsx',import.meta.url),'utf8');
 const temporal=readFileSync(new URL('../src/components/TemporalFields.tsx',import.meta.url),'utf8');
 const eventSheet=readFileSync(new URL('../src/components/EventSheet.tsx',import.meta.url),'utf8');
 const taskSheet=readFileSync(new URL('../src/components/TaskSheet.tsx',import.meta.url),'utf8');
 const context=readFileSync(new URL('../src/context/AppDataContext.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(settings,/>Archive</); assert.doesNotMatch(temporal,/Specific timezone|Floating local time/);
 assert.match(temporal,/normalized === 'all-day'.*End date/); assert.match(taskSheet,/>Tag \/ Category</);
 assert.ok(eventSheet.indexOf('value="entire-series"') < eventSheet.indexOf('value="this-event"'));
 assert.match(eventSheet,/events\.filter\(event => event\.recurringGroupId === groupId\)/);
 assert.match(context,/people: moveOrderedEntity/); assert.match(context,/projects: moveOrderedEntity/);
 assert.match(readFileSync(new URL('../src/lib/version.ts',import.meta.url),'utf8'),/v0.5.31/);
});

test('v0.5.23 settings shares one UpDownControl and Event-only deletion UI',()=>{const source=readFileSync(new URL('../src/pages/SettingsView.tsx',import.meta.url),'utf8');assert.equal((source.match(/<UpDownControl /g)||[]).length,3);assert.doesNotMatch(source,/>↑<|>↓</);assert.match(source,/totalTasks>0\|\|usage\[deleting.id\]\.relatedEvents>0/);assert.match(source,/Remove Project from Tasks and Events/);assert.match(source,/Reassign Tasks and Events/);});

test('v0.5.23 EventSheet keeps Multi-day and Repeat adjacent with single-record copy',()=>{const source=readFileSync(new URL('../src/components/EventSheet.tsx',import.meta.url),'utf8');assert.match(source,/aria-label="Event span and repeat"/);assert.match(source,/One Event spanning consecutive dates/);assert.match(source,/Separate editable Event occurrences on a frequency/);assert.match(source,/Spans \{multiDayCount\} consecutive day/);assert.doesNotMatch(source,/!initialData && !multiDay|one per day, all-day/);assert.match(source,/disabled=\{repeat\}/);assert.match(source,/disabled=\{multiDay\}/);});
