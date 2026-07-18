import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('static retirement workers replace historical service worker endpoints without fetch interception', () => {
  for (const path of ['public/sw.js', 'public/service-worker.js']) {
    const worker = read(path);
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)));
    assert.match(worker, /skipWaiting/); assert.match(worker, /registration\.unregister/); assert.match(worker, /caches\.delete/);
    assert.doesNotMatch(worker, /addEventListener\(['"]fetch/);
    assert.doesNotMatch(worker, /index\.html/);
  }
  assert.match(read('public/registerSW.js'), /retired/);
});

test('retirement startup runs before React mount and protects calendar stores and unrelated caches', () => {
  const main = read('src/main.tsx'); const startup = read('src/startup.tsx');
  assert.ok(main.indexOf('retireLegacyServiceWorkersOnce()') < main.indexOf('createRoot(root).render'));
  assert.match(startup, /APP_CACHE_PREFIXES/); assert.match(startup, /filter\(isAppAssetCache\)/);
  assert.match(startup, /lifegrid_sw_retirement_v05151/); assert.match(startup, /lifegrid_sw_retirement_reload_v05151/);
  assert.match(startup, /getRegistrations/); assert.match(startup, /registration\.unregister/); assert.match(startup, /withTimeout/);
  assert.doesNotMatch(startup, /localStorage\.clear/); assert.doesNotMatch(startup, /indexedDB\.deleteDatabase/);
});

test('release identity and Vercel worker routes are cache-safe', () => {
  assert.match(read('src/lib/version.ts'), /APP_VERSION = [\"']v0\.5\.15\.4[\"']/);
  assert.equal(JSON.parse(read('public/version.json')).appVersion, 'v0.5.15.4');
  assert.match(read('index.html'), /lifegrid-app-version" content="v0\.5\.15\.4/);
  const vercel = read('../../vercel.json');
  for (const path of ['/sw.js', '/service-worker.js', '/registerSW.js', '/version.json']) assert.match(vercel, new RegExp(path.replace('.', '\\.')));
  assert.match(vercel, /no-cache, no-store, must-revalidate/);
  assert.match(vercel, /Service-Worker-Allowed/);
});
