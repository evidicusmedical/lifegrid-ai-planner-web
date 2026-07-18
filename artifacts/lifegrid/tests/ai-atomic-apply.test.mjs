import test from 'node:test'; import assert from 'node:assert/strict';
import { applyPatchAtomically } from '../.test-build/lib/aiPatchApply.js';
const base = () => ({ categories:[{id:'other',label:'Other',color:'#666'}],people:[],projects:[],tasks:[],events:[],personEvents:[] });
test('atomic apply keeps inputs immutable and orders parents first', () => { const data=base(), patch={people:{add:[{id:'p',label:'Pat'}]},peopleSchedule:{add:[{id:'s',person:'p',title:'Shift',date:'2026-01-01'}]}}; const result=applyPatchAtomically(data,patch); assert.equal(result.data.people.length,1); assert.equal(result.data.personEvents.length,1); assert.deepEqual(data,base()); assert.equal(patch.people.add[0].id,'p'); });
test('atomic apply rejects duplicates without returning partial data', () => { const data=base(); assert.throws(()=>applyPatchAtomically(data,{categories:{add:[{id:'other'}]}})); assert.deepEqual(data,base()); });
test('atomic apply rejects orphan final references', () => { assert.throws(()=>applyPatchAtomically(base(),{events:{add:[{id:'e',category:'missing',title:'x'}]}}),/does not exist/); });
test('exact additions are blocked using a preflight index while title-only matches are advisory', async () => {
  const { preflightPatch } = await import('../.test-build/lib/aiPatchApply.js');
  const data=base(); data.events.push({id:'e1',title:'Fictional briefing',date:'2030-01-02',endDate:null,startTime:'09:00',endTime:'10:00',timeStatus:'timed',category:'other',linkedTaskIds:[]});
  const exact=preflightPatch(data,{events:{add:[{id:'e2',title:' fictional  briefing ',date:'2030-01-02',endDate:null,startTime:'09:00',endTime:'10:00',timeStatus:'timed',category:'other',linkedTaskIds:[]}]}});
  assert.ok(exact.findings.some(f=>f.code==='EXACT_DUPLICATE_ADDITION'&&f.severity==='blocking'));
  const possible=preflightPatch(data,{events:{add:[{id:'e3',title:'Fictional briefing',date:'2030-01-03',endDate:null,startTime:'09:00',endTime:'10:00',timeStatus:'timed',category:'other',linkedTaskIds:[]}]}});
  assert.ok(possible.findings.some(f=>f.code==='POSSIBLE_DUPLICATE_ADDITION'&&f.severity==='warning'));
});
