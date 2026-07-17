import test from 'node:test'; import assert from 'node:assert/strict';
import { temporalErrors } from '../.test-build/lib/temporal.js';
const timed = { date:'2026-07-18', endDate:'2026-07-18', timeStatus:'timed', startTime:'09:00', endTime:'10:00', timeZoneMode:'zoned', timeZone:'America/Chicago' };
test('accepts valid all-day and unknown records', () => { assert.deepEqual(temporalErrors({...timed,timeStatus:'all-day',startTime:null,endTime:null,timeZone:null,timeZoneMode:null}), []); assert.deepEqual(temporalErrors({...timed,timeStatus:'unknown',startTime:null,endTime:null,timeZone:null,timeZoneMode:null}), []); });
test('rejects incompatible all-day and unknown clock fields', () => assert.ok(temporalErrors({...timed,timeStatus:'all-day'}).length));
test('validates zoned and floating requirements', () => { assert.deepEqual(temporalErrors(timed), []); assert.ok(temporalErrors({...timed,timeZone:null}).length); assert.ok(temporalErrors({...timed,timeZoneMode:'floating',timeZone:'UTC'}).length); assert.deepEqual(temporalErrors({...timed,timeZoneMode:'floating',timeZone:null}), []); });
test('rejects equal and backwards same-day clock ranges', () => { assert.ok(temporalErrors({...timed,endTime:'09:00'}).length); assert.ok(temporalErrors({...timed,endTime:'08:00'}).length); });
test('accepts overnight and multi-date ranges', () => { assert.deepEqual(temporalErrors({...timed,endDate:'2026-07-19',endTime:'02:00'}), []); assert.deepEqual(temporalErrors({...timed,endDate:'2026-07-20'}), []); });
