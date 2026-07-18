import test from 'node:test'; import assert from 'node:assert/strict';
import { serializeBackup, parseBackup, normalizeBackup, BACKUP_SCHEMA_VERSION } from '../.test-build/lib/backup.js';
const store={activeCalendarId:'one',calendars:[{id:'one',name:'Fictional',createdAt:'2026-01-01T00:00:00.000Z',displayTimeZone:'UTC',data:{events:[],tasks:[],personEvents:[],categories:[{id:'other',label:'Other',color:'#666'}],people:[],projects:[],milestones:[]}}]};
test('v6 backup round trip preserves deterministic metadata and calendar isolation',()=>{const text=serializeBackup(store,'2026-02-03T00:00:00.000Z'), parsed=parseBackup(text), normalized=normalizeBackup(parsed);assert.equal(parsed.version,BACKUP_SCHEMA_VERSION);assert.equal(parsed.exportedAt,'2026-02-03T00:00:00.000Z');assert.deepEqual(normalized,store);});
test('backup normalization rejects duplicate calendar identifiers',()=>assert.throws(()=>normalizeBackup({version:6,calendars:[...store.calendars,...store.calendars]}),/Duplicate/));
