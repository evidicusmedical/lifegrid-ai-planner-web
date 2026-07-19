import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/GridView.tsx', import.meta.url), 'utf8');
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

test('v0.5.18 retains one responsive export form and desktop header controls', () => {
  assert.match(source, /compactExportLayout/);
  assert.match(source, /data-testid=\{compactExportLayout \? "panel-export-mobile" : "panel-export-options"\}/);
  assert.match(source, /hidden md:flex items-center rounded-lg bg-muted p-0.5/);
  assert.match(source, /hidden sm:flex items-center rounded-lg bg-muted p-0.5/);
  assert.match(source, /setExportMode\("visible"\)/);
  assert.match(source, /setExportPixelRatio\(2\)/);
});

test('mobile export sheet owns scrolling, viewport bounds, safe footer, and background lock', () => {
  assert.match(source, /export-modal-layer fixed inset-0 z-\[100\] flex bg-black\/45/);
  assert.match(source, /h-\[100vh\] h-\[100dvh\]/);
  assert.match(source, /overflow-y-auto overscroll-contain/);
  assert.match(source, /mobile-export-footer/);
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /body\.style\.position = "fixed"/);
  assert.match(source, /role=\{compactExportLayout \? "dialog"/);
  assert.match(source, /exportButtonRef\.current\?\.focus\(\)/);
});

test('mobile sheet retains every export control and the shared generation handler', () => {
  for (const text of ['Export density', 'Custom title', 'Custom subtitle', 'Include generated timestamp', 'Current grid', 'Next 7', 'Next 14', 'Next 30', 'Reset Export Range', 'Tags / categories', 'Project', 'Visible', 'Expanded', 'Fast', 'Sharp']) assert.match(source, new RegExp(text));
  assert.match(source, /onClick=\{handleExport\}/);
  assert.match(source, /data-testid="select-export-project"/);
  assert.match(source, /data-testid="input-export-start"/);
  assert.match(source, /data-testid="input-export-end"/);
  assert.match(source, /max-w-full rounded-lg shadow-2xl/);
  assert.match(source, /button-export-share/);
  assert.match(source, /button-export-download/);
});

test('release identity and compatibility contracts are v0.5.18', () => {
  assert.match(read('../src/lib/version.ts'), /APP_VERSION = ["']v0\.5\.21["']/);
  assert.match(read('../package.json'), /"version": "0\.5\.21"/);
  assert.match(read('../public/version.json'), /"appVersion": "v0\.5\.21"/);
  assert.match(read('../index.html'), /lifegrid-app-version" content="v0\.5\.21"/);
  assert.match(read('../src/lib/version.ts'), /AI_INTERCHANGE_VERSION = 4/);
  assert.match(read('../src/lib/backup.ts'), /BACKUP_SCHEMA_VERSION = 7/);
});
