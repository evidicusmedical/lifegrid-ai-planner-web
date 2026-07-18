import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const grid=readFileSync(new URL('../src/pages/GridView.tsx', import.meta.url),'utf8'), detail=readFileSync(new URL('../src/components/DayDetailSheet.tsx', import.meta.url),'utf8');
test('grid retains intentional horizontal scrolling and event propagation contract',()=>{assert.match(grid,/overflow-x-auto/);assert.match(grid,/stopPropagation/);assert.match(grid,/denseDay\.overflow/);});
test('day detail has mobile dynamic sizing and wrapping',()=>{assert.match(detail,/mobile-sheet/);assert.match(detail,/wrap-anywhere/);assert.match(detail,/day-event-/);});
