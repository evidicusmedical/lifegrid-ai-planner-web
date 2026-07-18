import test from 'node:test'; import assert from 'node:assert/strict'; import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx', import.meta.url),'utf8'), nav=readFileSync(new URL('../src/components/BottomNav.tsx', import.meta.url),'utf8');
test('mobile navigation has all primary labelled routes and history handling',()=>{ for(const route of ['grid','tasks','projects','people','ai','settings']) assert.match(nav,new RegExp(`id: '${route}'`)); assert.match(nav,/aria-current/); assert.match(nav,/aria-label/); assert.match(nav,/safe-area-inset-bottom/); assert.match(app,/pushState/); assert.match(app,/popstate/); });
test('navigation touch targets do not rely on icons',()=>assert.match(nav,/min-h-11/));
