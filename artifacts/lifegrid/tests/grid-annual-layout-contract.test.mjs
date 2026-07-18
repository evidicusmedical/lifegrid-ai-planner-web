import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const grid = readFileSync(new URL('../src/pages/GridView.tsx', import.meta.url), 'utf8');
const model = readFileSync(new URL('../src/lib/gridModel.ts', import.meta.url), 'utf8');

test('Grid uses one stable compact annual table with all twelve chronological month columns', () => {
  assert.match(grid, /ref=\{publicationRef\}/);
  assert.match(grid, /<table/);
  assert.match(grid, /MONTHS\.map\(\(m, mIdx\)/);
  assert.match(grid, /data-testid=\{`header-month-\$\{mIdx\}`\}/);
  assert.match(grid, /minWidth: DAY_COL_W \+ MONTHS\.length \* MONTH_COL_W/);
  assert.doesNotMatch(grid, /<section className="grid-month/);
  assert.doesNotMatch(grid, /mountedMonthKeys\.map/);
});

test('canonical annual model creates fixed January-to-December slots regardless of priority', () => {
  assert.match(model, /Array\.from\(\{ length: 12 \}, \(_, index\) =>/);
  assert.match(model, /String\(index \+ 1\)\.padStart\(2, '0'\)/);
  assert.doesNotMatch(grid, /getGridMountOrder|gridMonthKey|GridMonthModel|yieldToBrowser|AbortController/);
});

test('current and selected dates remain highlights inside their canonical annual cells', () => {
  assert.match(grid, /const temporal = getDateTemporalState\(\s*dateStr,\s*todayStr,\s*detailDate,?\s*\)/);
  assert.match(grid, /temporal\.isSelected/);
  assert.match(grid, /setDetailDate\(dateStr\)/);
});

test('July priority cannot move July before June in DOM or visual slot order', () => {
  const monthHeaders = Array.from({ length: 12 }, (_, index) => `header-month-${index}`);
  assert.deepEqual(monthHeaders.slice(5, 7), ['header-month-5', 'header-month-6']);
  assert.match(grid, /MONTHS\.map\(\(m, mIdx\)/);
  assert.doesNotMatch(grid, /mountedMonthKeys/);
});

test('annual export reuses the chronological compact table and never a month stack', () => {
  assert.match(grid, /ref=\{tableRef\}/);
  assert.match(grid, /monthVisible =\s*exporting \|\| renderedMonths\.has\(mIdx\)/);
  assert.doesNotMatch(grid, /data-lifegrid-grid-month/);
});
