import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/pages/GridView.tsx', import.meta.url), 'utf8');
const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');

test('responsive export form hides renderer implementation choices', () => { assert.match(source, /compactExportLayout/); for (const text of ['>Visible<','>Expanded<','>Fast<','>Sharp<','Export density']) assert.doesNotMatch(source, new RegExp(text)); });

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

test('mobile sheet retains publication choices and shared generation handler', () => { for (const text of ['Custom title','Custom subtitle','Current Grid','Calendar Year','Next 7','Next 14','Next 30','Tags / categories','Project']) assert.match(source,new RegExp(text)); assert.match(source,/onClick=\{handleExport\}/); assert.match(source,/button-export-share/); assert.match(source,/button-export-download/); });

test('release identity and compatibility contracts are v0.5.18', () => {
  assert.match(read('../src/lib/version.ts'), /APP_VERSION = ["']v0\.5\.27["']/);
  assert.match(read('../package.json'), /"version": "0.5.27"/);
  assert.match(read('../public/version.json'), /"appVersion": "v0\.5\.27"/);
  assert.match(read('../index.html'), /lifegrid-app-version" content="v0\.5\.27"/);
  assert.match(read('../src/lib/version.ts'), /AI_INTERCHANGE_VERSION = 5/);
  assert.match(read('../src/lib/backup.ts'), /BACKUP_SCHEMA_VERSION = 7/);
});
