import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGridViewModel, selectEventsIntersectingYear, toGridEventSummary, resolveEventById } from '../.test-build/lib/gridModel.js';

const event = (id, date, endDate = date, overrides = {}) => ({ id, date, endDate, timeStatus: 'all-day', timeZone: null, timeZoneMode: null, title: `Fictional item ${id}`, category: 'fictional', startTime: null, endTime: null, color: '#123456', notes: 'private-looking but fictional long note '.repeat(50), aiNotes: 'fictional ai note '.repeat(50), sourceNotes: 'fictional source note '.repeat(50), linkedTaskIds: ['task-1'], displayPriority: 4, showInGrid: true, showInExport: true, ...overrides });

test('year selection is immutable and range-aware', () => {
  const records = [event('before', '2025-01-01'), event('after', '2027-01-01'), event('inside', '2026-06-01'), event('into', '2025-12-30', '2026-01-02'), event('out', '2026-12-30', '2027-01-02'), event('cover', '2025-01-01', '2027-12-31')];
  const snapshot = structuredClone(records);
  assert.deepEqual(selectEventsIntersectingYear(records, 2026, 'UTC').map(x => x.id), ['inside', 'into', 'out', 'cover']);
  assert.deepEqual(records, snapshot);
});

test('annual summaries contain display data and no private/full-record fields', () => {
  const full = event('day-type', '2026-07-04', '2026-07-04', { eventKind: 'day-type' });
  const summary = toGridEventSummary(full, 'UTC');
  assert.deepEqual(Object.keys(summary).sort(), ['category','color','date','displayPriority','endDate','endTime','eventKind','id','showInGrid','startTime','timeStatus','title']);
  for (const key of ['notes', 'aiNotes', 'sourceNotes', 'linkedTaskIds', 'recurringGroupId']) assert.equal(key in summary, false);
  assert.deepEqual(toGridEventSummary({ ...full, notes: 'changed', aiNotes: 'changed', sourceNotes: 'changed' }, 'UTC'), summary);
  assert.equal(resolveEventById([full], summary.id)?.notes, full.notes);
});

test('month models retain unchanged references and only project displayed-year records', () => {
  const records = [event('jan', '2026-01-01'), event('jul', '2026-07-04'), event('other', '2025-07-04')];
  const first = buildGridViewModel(records, 2026, 'UTC');
  const noteOnly = buildGridViewModel([{ ...records[0], notes: 'new note' }, records[1], records[2]], 2026, 'UTC', new Map(), first);
  assert.equal(noteOnly.months[0], first.months[0]);
  const changed = buildGridViewModel([records[0], { ...records[1], title: 'Changed display title' }, records[2]], 2026, 'UTC', new Map(), noteOnly);
  assert.equal(changed.summaries.length, 2);
  assert.equal(changed.months[0], noteOnly.months[0]);
  assert.notEqual(changed.months[6], noteOnly.months[6]);
});
