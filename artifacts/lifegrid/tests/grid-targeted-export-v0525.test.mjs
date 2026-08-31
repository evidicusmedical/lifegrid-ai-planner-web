import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEventsForGridExport, resolveExportDateRange, validateExportRange } from '../.test-build/lib/gridAwareness.js';
import { gridRendererStrategy } from '../.test-build/lib/gridImageRenderer.js';

test('range resolver returns the annual Current Grid', () => assert.deepEqual(resolveExportDateRange('current', 2026, '2026-08-20'), { start: '2026-01-01', end: '2026-12-31' }));
test('Next 7 begins today', () => assert.deepEqual(resolveExportDateRange('next7', 2026, '2026-08-20'), { start: '2026-08-20', end: '2026-08-26' }));
test('Next 14 begins today', () => assert.deepEqual(resolveExportDateRange('next14', 2026, '2026-08-20'), { start: '2026-08-20', end: '2026-09-02' }));
test('Next 30 begins today', () => assert.deepEqual(resolveExportDateRange('next30', 2026, '2026-08-20'), { start: '2026-08-20', end: '2026-09-18' }));
test('Custom preserves its explicit dates', () => assert.deepEqual(resolveExportDateRange('custom', 2026, '2026-08-20', '2026-12-28', '2027-01-06'), { start: '2026-12-28', end: '2027-01-06' }));
test('relative resolver crosses a year boundary', () => assert.deepEqual(resolveExportDateRange('next7', 2026, '2026-12-28'), { start: '2026-12-28', end: '2027-01-03' }));
test('relative presets ignore an unrelated selected detail date by contract', () => assert.equal(resolveExportDateRange('next7', 2026, '2026-08-20').start, '2026-08-20'));

test('validation rejects a missing start or end', () => {
  assert.match(validateExportRange({ start: '', end: '2026-01-01' }, 2026, true), /both/);
  assert.match(validateExportRange({ start: '2026-01-01', end: '' }, 2026, true), /both/);
});
test('validation rejects reversed dates', () => assert.match(validateExportRange({ start: '2026-02-02', end: '2026-02-01' }, 2026, true), /on or before/));
test('validation accepts targeted ranges through twelve months', () => assert.equal(validateExportRange({ start: '2026-01-01', end: '2026-12-31' }, 2026, true), null));
test('validation accepts a short cross-year targeted range', () => assert.equal(validateExportRange({ start: '2026-12-28', end: '2027-01-06' }, 2026, true), null));
test('rolling validation permits a cross-year window', () => assert.equal(validateExportRange({ start: '2026-12-28', end: '2027-01-03' }, 2026), null));
test('renderer strategy preserves targeted Firefox and adds bounded month fallbacks',()=>{
 assert.deepEqual(gridRendererStrategy({targeted:true,firefox:true,layout:'rolling-day-grid'}),['canvas2d']);
 assert.deepEqual(gridRendererStrategy({targeted:false,firefox:true,layout:'month-columns'}),['canvas2d','html-to-image','html2canvas']);
 assert.deepEqual(gridRendererStrategy({targeted:false,firefox:false,layout:'month-columns'}),['html-to-image','html2canvas','canvas2d']);
 assert.deepEqual(gridRendererStrategy({targeted:true,firefox:false,layout:'rolling-day-grid'}),['html-to-image','html2canvas']);
});

const events = [
  { id: 'before', date: '2026-08-01', category: 'work' },
  { id: 'after', date: '2026-08-20', category: 'work' },
  { id: 'multi', date: '2026-08-05', endDate: '2026-08-09', category: 'work' },
  { id: 'other-category', date: '2026-08-07', category: 'personal' },
  { id: 'private', date: '2026-08-07', category: 'work', showInExport: false },
  { id: 'project', date: '2026-08-07', category: 'work' },
];
const range = { start: '2026-08-07', end: '2026-08-08' };
test('filter excludes events before and after the range and includes intersecting multi-day events', () => assert.deepEqual(filterEventsForGridExport(events, range, null, null).map(event => event.id), ['multi', 'other-category', 'project']));
test('filter applies selected Categories', () => assert.deepEqual(filterEventsForGridExport(events, range, new Set(['personal']), null).map(event => event.id), ['other-category']));
test('filter applies direct or derived Project membership', () => assert.deepEqual(filterEventsForGridExport(events, range, null, 'p1', event => new Set(event.id === 'project' || event.id === 'multi' ? ['p1'] : [])).map(event => event.id), ['multi', 'project']));
test('filter always excludes showInExport false before other filters', () => assert.equal(filterEventsForGridExport(events, range, new Set(['work']), null).some(event => event.id === 'private'), false));
test('month Canvas2D fallback uses semantic publication Event attributes',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../src/lib/gridImageRenderer.ts',import.meta.url),'utf8');assert.match(source,/data-publication-event=\\?"true/);assert.match(source,/dataset\.publicationEventTitle/);assert.match(source,/dataset\.exportTitleLines/);});
