import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { layoutPublicationTextLines } from '../.test-build/lib/gridPublicationText.js';
import { APP_VERSION, AI_INTERCHANGE_VERSION } from '../.test-build/lib/version.js';
import { BACKUP_SCHEMA_VERSION } from '../.test-build/lib/backup.js';

const mono = value => value.length;
const layout = (text, maxWidth, maxLines=20, options={}) => layoutPublicationTextLines({text,maxWidth,maxLines,measureText:mono,...options});
const read = path => readFile(new URL(path, import.meta.url), 'utf8');

for (const label of ['USAF','Fun','Admin','Family','Holidays']) test(`${label} stays on one line when it fits`,()=>assert.deepEqual(layout(label,label.length).lines,[label]));
test('long Category labels wrap only at spaces',()=>{const result=layout('Certification, Credentials and Continuing Education',18);assert.equal(result.usedInternalTokenBreak,false);assert.equal(result.lines.join(' '),'Certification, Credentials and Continuing Education');});
test('slash punctuation is not left alone when an adjacent grouping fits',()=>{const result=layout('Relationship / Wife',14);assert.ok(!result.lines.includes('/'));});
test('tokens split internally only when they alone exceed the line',()=>{assert.equal(layout('Onboarding',10).usedInternalTokenBreak,false);assert.equal(layout('ExtraordinaryUnbrokenToken',10).usedInternalTokenBreak,true);});
test('Dietician title balances an avoidable final 1',()=>{const result=layout('Dietician Class for Starting GLP 1',32);assert.notEqual(result.lines.at(-1),'1');assert.equal(result.balancedFinalLine,true);});
test('balancing never exceeds maxWidth',()=>{const result=layout('alpha beta gamma x',12);assert.ok(result.lines.every(line=>mono(line)<=12));});
test('balancing preserves word order',()=>{const source='alpha beta gamma x';assert.equal(layout(source,12).lines.join(' '),source);});
test('ordinary representative title remains complete',()=>{const source='Drop off Natalie before Chicago trip';const result=layout(source,19,3);assert.equal(result.truncated,false);assert.equal(result.lines.join(' '),source);});
test('exceptional prose ellipsizes only its final permitted line',()=>{const result=layout('one two three four five six seven eight nine ten',12,2);assert.equal(result.truncated,true);assert.match(result.lines.at(-1),/…$/);});
test('source strings are never changed',()=>{const source='  Requested day off - spouse visit planning  ';layout(source,12);assert.equal(source,'  Requested day off - spouse visit planning  ');});
test('month matrix table is content-bound rather than flex stretched',async()=>{const grid=await read('../src/pages/GridView.tsx');assert.doesNotMatch(grid,/month-matrix' \? 'flex-1'/);assert.match(grid,/table className="min-h-0 w-full table-fixed/);});
test('APP_VERSION is v0.5.31',()=>assert.equal(APP_VERSION,'v0.5.31'));
test('AI_INTERCHANGE_VERSION remains 5',()=>assert.equal(AI_INTERCHANGE_VERSION,5));
test('BACKUP_SCHEMA_VERSION remains 7',()=>assert.equal(BACKUP_SCHEMA_VERSION,7));
