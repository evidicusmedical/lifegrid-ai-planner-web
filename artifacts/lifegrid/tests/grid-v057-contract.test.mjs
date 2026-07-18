import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('v0.5.13 retains release compatibility versions', () => {
  assert.match(read('src/lib/version.ts'), /APP_VERSION = 'v0\.5\.13'/);
  assert.match(read('src/lib/version.ts'), /AI_INTERCHANGE_VERSION = 4/);
  assert.match(read('src/lib/backup.ts'), /BACKUP_SCHEMA_VERSION = 6/);
});

test('route-only Grid navigation only updates hash and local tab state', () => {
  const app = read('src/App.tsx');
  assert.match(app, /beginGridTransition\(\)/);
  assert.match(app, /setTab\(next\)/);
  assert.doesNotMatch(app, /exportBackup\(|analyzeDependencies\(/);
});
