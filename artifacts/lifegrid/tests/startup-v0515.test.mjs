import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('mobile launch contract has a root-only standalone manifest and real icons', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.id, '/'); assert.equal(manifest.start_url, '/'); assert.equal(manifest.scope, '/'); assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.every(icon => existsSync(new URL(`../public/${icon.src.slice(1)}`, import.meta.url))));
  assert.match(read('index.html'), /viewport-fit=cover/); assert.match(read('index.html'), /lifegrid-startup-shell/);
});
test('startup recovery keeps calendar storage separate from asset cache cleanup', () => {
  const startup = read('src/startup.tsx');
  assert.match(startup, /caches\.delete/); assert.match(startup, /lifegrid_store_v5/); assert.match(startup, /sessionStorage/); assert.match(startup, /Copy Diagnostic Summary/);
  assert.doesNotMatch(startup, /localStorage\.clear/);
});
