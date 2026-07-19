import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const grid = read('../src/pages/GridView.tsx');
test('mobile export owns a global layer and fixed dialog regions', () => {
  assert.match(grid, /export-modal-layer fixed inset-0 z-\[100\]/);
  assert.match(grid, /export-modal-panel[\s\S]*overflow-hidden/);
  assert.match(grid, /export-modal-body min-h-0 flex-1 overflow-x-hidden overflow-y-auto/);
  assert.match(grid, /\[-webkit-overflow-scrolling:touch\] touch-pan-y/);
  assert.match(grid, /<footer className="export-modal-footer flex flex-none/);
  assert.match(grid, /data-testid="mobile-export-footer"/);
  assert.ok(grid.indexOf('export-modal-body') < grid.indexOf('export-modal-footer'));
});
test('mobile scroll lock preserves background and release versions remain compatible', () => {
  assert.match(grid, /body\.style\.position = "fixed"/);
  assert.match(grid, /window\.scrollTo\(0, scrollY\)/);
  assert.match(grid, /grid\.scrollTop = gridPosition\.top/);
  assert.match(read('../src/lib/version.ts'), /APP_VERSION = ["']v0\.5\.18["']/);
  assert.match(read('../package.json'), /"version": "0\.5\.18"/);
  assert.equal(JSON.parse(read('../public/version.json')).appVersion, 'v0.5.18');
});
