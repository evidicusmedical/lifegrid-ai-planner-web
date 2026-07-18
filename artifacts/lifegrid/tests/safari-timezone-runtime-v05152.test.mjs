import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeBackup } from '../.test-build/lib/backup.js';
const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('GridView permanently excludes timezone clock runtime', () => {
  const grid = read('src/pages/GridView.tsx');
  assert.doesNotMatch(grid, /clockNow|clockFor/);
  assert.doesNotMatch(grid, /setInterval\s*\(/);
  assert.doesNotMatch(grid, /Intl\.DateTimeFormat/);
  assert.doesNotMatch(grid, /displayTimeZone/);
});

test('compatibility calendar timezone metadata is discarded without changing entered local values', () => {
  for (const displayTimeZone of ['local', 'America/New_York', null, '', 'not/a zone']) {
    const store = normalizeBackup({ version: 7, store: { activeCalendarId: 'c', calendars: [{ id: 'c', name: 'C', createdAt: 'x', displayTimeZone, data: { events: [{ id: 'e', date: '2026-07-21', endDate: '2026-07-22', timeStatus: 'timed', startTime: '08:00', endTime: '08:15' }] } }] } });
    const event = store.calendars[0].data.events[0];
    assert.equal('displayTimeZone' in store.calendars[0], false);
    assert.deepEqual([event.date, event.endDate, event.startTime, event.endTime], ['2026-07-21', '2026-07-22', '08:00', '08:15']);
  }
});

test('release version markers remain aligned', () => {
  assert.match(read('src/lib/version.ts'), /APP_VERSION = [\"']v0\.5\.17[\"']/);
  assert.equal(JSON.parse(read('public/version.json')).appVersion, 'v0.5.17');
  assert.match(read('index.html'), /lifegrid-app-version" content="v0\.5\.17"/);
  assert.equal(JSON.parse(read('package.json')).version, '0.5.17');
});
