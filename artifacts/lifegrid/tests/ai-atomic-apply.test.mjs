import test from 'node:test'; import assert from 'node:assert/strict';
import { applyPatchAtomically } from '../.test-build/lib/aiPatchApply.js';
const base = () => ({ categories:[{id:'other',label:'Other',color:'#666'}],people:[],projects:[],tasks:[],events:[],personEvents:[] });
test('atomic apply keeps inputs immutable and orders parents first', () => { const data=base(), patch={people:{add:[{id:'p',label:'Pat'}]},peopleSchedule:{add:[{id:'s',person:'p',title:'Shift',date:'2026-01-01'}]}}; const result=applyPatchAtomically(data,patch); assert.equal(result.data.people.length,1); assert.equal(result.data.personEvents.length,1); assert.deepEqual(data,base()); assert.equal(patch.people.add[0].id,'p'); });
test('atomic apply rejects duplicates without returning partial data', () => { const data=base(); assert.throws(()=>applyPatchAtomically(data,{categories:{add:[{id:'other'}]}})); assert.deepEqual(data,base()); });
test('atomic apply rejects orphan final references', () => { assert.throws(()=>applyPatchAtomically(base(),{events:{add:[{id:'e',category:'missing',title:'x'}]}}),/does not exist/); });
