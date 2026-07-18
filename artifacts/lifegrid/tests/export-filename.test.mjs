import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLifeGridExportFilename, formatExportTimestamp, sanitizeExportName } from '../.test-build/lib/exportFilenames.js';
const instant = new Date('2026-07-17T20:08:05.000Z');
test('JSON and ICS filenames are descriptive and deterministic', () => {
  assert.equal(buildLifeGridExportFilename({ kind: 'json_backup', calendarName: 'Jon’s Calendar', generatedAt: instant, timeZone: 'America/New_York' }), 'lifegrid_json_backup_Jon-s-Calendar_2026-07-17_16-08-05.json');
  assert.equal(buildLifeGridExportFilename({ kind: 'ics_calendar', calendarName: "Jon's Calendar", generatedAt: instant, timeZone: 'America/New_York' }), 'lifegrid_ics_calendar_Jon-s-Calendar_2026-07-17_16-08-05.ics');
});
test('sanitization blocks unsafe, blank, emoji-only, and oversized names', () => {
  assert.equal(sanitizeExportName('  Work / Personal  '), 'Work-Personal'); assert.equal(sanitizeExportName('../../calendar'), 'calendar'); assert.equal(sanitizeExportName('✨'), 'Calendar');
  assert.equal(sanitizeExportName('Family: 2026'), 'Family-2026'); assert.ok(sanitizeExportName('a'.repeat(200)).length <= 80);
});
test('timezone fallback and collision suffix are deterministic', () => {
  assert.equal(formatExportTimestamp(instant, 'Invalid/Zone'), '2026-07-17_20-08-05');
  assert.match(buildLifeGridExportFilename({ kind: 'json_backup', calendarName: 'Calendar', generatedAt: instant, timeZone: 'UTC', collisionIndex: 2 }), /_2\.json$/);
});
