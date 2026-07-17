import test from 'node:test'; import assert from 'node:assert/strict';
import { temporalErrors, analyzeTemporalReview } from '../.test-build/lib/temporal.js';
const base={id:'e1',title:'DST',date:'2026-03-08',endDate:'2026-03-08',timeStatus:'timed',startTime:'02:30',endTime:'03:30',timeZoneMode:'zoned',timeZone:'America/New_York'};
test('rejects deterministic DST spring gap', () => assert.match(temporalErrors(base).join(' '), /does not exist/));
test('rejects deterministic DST fall fold', () => assert.match(temporalErrors({...base,date:'2026-11-01',endDate:'2026-11-01',startTime:'01:30',endTime:'03:30'}).join(' '), /ambiguous/));
test('review findings are stable and cover both record classes', () => { const x=analyzeTemporalReview([{...base,startTime:'09:00',endTime:null}], [{...base,id:'p1',title:'Person',timeZone:null}]); assert.deepEqual(x.map(i=>i.key), ['event:e1:START_WITHOUT_END','event:e1:INVALID_TEMPORAL_COMBINATION','person-schedule:p1:ZONED_WITHOUT_TIMEZONE','person-schedule:p1:INVALID_TEMPORAL_COMBINATION']); });
test('review issue disappears after correction', () => assert.equal(analyzeTemporalReview([{...base,date:'2026-03-09',endDate:'2026-03-09',startTime:'09:00',endTime:'10:00'}],[]).length,0));
