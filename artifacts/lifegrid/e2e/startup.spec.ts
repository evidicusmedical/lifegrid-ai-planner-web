import { test, expect } from '@playwright/test';
const routes=['/','/#grid','/#tasks','/#people','/#ai','/#settings','/#unknown'];
test.describe('startup and retirement contracts',()=>{
  test.beforeEach(async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('/');await expect(page.getByTestId('app-header')).toBeVisible();expect(errors).toEqual([]);});
  for(const route of routes) test(`loads ${route} @smoke`,async({page})=>{await page.goto(route);await expect(page.getByTestId('app-header')).toContainText('v0.5.17');});
  test('publishes version, manifest, and inert retirement workers @smoke',async({request})=>{const version=await request.get('/version.json');await expect(version).toBeOK();await expect(version).toHaveJSON({appVersion:'v0.5.17',aiInterchangeVersion:4,backupSchemaVersion:7});for(const path of ['/manifest.webmanifest','/sw.js','/service-worker.js','/registerSW.js']){const response=await request.get(path);await expect(response).toBeOK();if(path.endsWith('worker.js')||path.endsWith('sw.js'))expect(await response.text()).not.toContain("addEventListener('fetch'");}});
});
