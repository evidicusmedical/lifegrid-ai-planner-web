import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTemporalReview } from '../.test-build/lib/temporal.js';
import { quickTemporalConfirmation, toFlaggedReviewItems } from '../.test-build/lib/timeReview.js';

const legacy = { id: 'event-1', title: 'School drop-off', date: '2026-07-18', endDate: null, timeStatus: undefined, startTime: null, endTime: null, timeZone: null, timeZoneMode: null, temporalReview: 'legacy-ambiguous', notes: 'keep' };
test('legacy ambiguity is a deterministic blocking flagged item with explicit choices', () => {
  const items = toFlaggedReviewItems(analyzeTemporalReview([legacy], []));
  assert.ok(items.length); assert.equal(items[0].severity, 'blocking');
  assert.ok(items[0].allowedActions.includes('confirm-all-day')); assert.ok(!items[0].allowedActions.includes('ignore'));
  assert.deepEqual(items, toFlaggedReviewItems(analyzeTemporalReview([legacy], [])));
});
test('quick confirmations preserve date and unrelated fields without mutation', () => {
  const allDay = quickTemporalConfirmation(legacy, 'all-day'); const unknown = quickTemporalConfirmation(legacy, 'unknown');
  assert.equal(allDay.date, legacy.date); assert.equal(allDay.notes, 'keep'); assert.equal(allDay.startTime, null); assert.equal(allDay.timeStatus, 'all-day');
  assert.equal(unknown.timeStatus, 'unknown'); assert.equal(unknown.endTime, null); assert.equal(legacy.timeStatus, undefined);
});
test('valid unusual and optional records do not create review flags', () => {
  const valid = { ...legacy, id: 'event-2', timeStatus: 'all-day', temporalReview: undefined };
  assert.deepEqual(toFlaggedReviewItems(analyzeTemporalReview([valid], [])), []);
});
