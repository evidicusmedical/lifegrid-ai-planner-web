import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTemporalReview } from '../.test-build/lib/temporal.js';
import { compareReviewFindings, reviewRefreshMessage } from '../.test-build/lib/timeReview.js';

const broken = { id: 'event-1', title: 'Broken', date: '2026-06-01', endDate: '2026-06-01', timeStatus: 'timed', startTime: '09:00', endTime: null, timeZoneMode: 'floating', timeZone: null };
test('refresh comparison is immutable and tracks resolved, remaining and new stable keys', () => {
  const before = analyzeTemporalReview([broken], []); const corrected = { ...broken, endTime: '10:00' }; const introduced = { ...broken, id: 'event-2', title: 'New' };
  const after = analyzeTemporalReview([corrected, introduced], []); const beforeCopy = structuredClone(before);
  assert.deepEqual(compareReviewFindings(before, after), { resolved: before.length, added: after.length, remaining: after.length });
  assert.deepEqual(before, beforeCopy); assert.match(reviewRefreshMessage(compareReviewFindings(before, after)), /resolved.*new issue/i);
});
test('analyzer receives only provided active-calendar records and never mutates them', () => {
  const active = structuredClone(broken); const inactive = { ...broken, id: 'inactive' }; const copy = structuredClone(active);
  const findings = analyzeTemporalReview([active], []);
  assert.ok(findings.every(issue => issue.recordId !== inactive.id)); assert.deepEqual(active, copy);
});
