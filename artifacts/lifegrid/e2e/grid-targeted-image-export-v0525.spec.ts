import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe.configure({ retries: 0 });
const iso = (offset: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const event = (id:string, offset:number, category='work', extra={}) => ({ id, date:iso(offset), endDate:iso(offset), title:`Recognizable ${id}`, category, projectId:null, timeStatus:'all-day', startTime:null, endTime:null, color:category==='work'?'#2563eb':'#16a34a', notes:null, displayPriority:4, showInGrid:true, showInExport:true, linkedTaskIds:[], aiNotes:null, sourceNotes:null, ...extra });

test.beforeEach(async ({ page }) => {
  const payload = { events:[event('today',0),event('tomorrow',1),event('day-6',6),event('day-7',7),event('day-13',13),event('day-14',14),event('day-29',29),event('day-30',30),event('other-category',2,'personal'),event('private',3,'work',{showInExport:false}),event('project-direct',4,'work',{projectId:'project'}),event('multi',-2,'work',{endDate:iso(3)}),event('outside',60),{...event('cross-year',0),date:'2026-12-30',endDate:'2027-01-02'}], tasks:[], personEvents:[], categories:[{id:'work',label:'Work',color:'#2563eb'},{id:'personal',label:'Personal',color:'#16a34a'}], people:[], projects:[{id:'project',name:'Project Alpha',color:'#2563eb',order:0,aliases:[],status:'active',notes:null}], milestones:[] };
  await page.addInitScript(data => localStorage.setItem('lifegrid_store_v5', JSON.stringify({activeCalendarId:'export-calendar',calendars:[{id:'export-calendar',name:"Jon's Calendar",createdAt:new Date().toISOString(),data}]})), payload);
  await page.goto('/');
  await page.getByRole('button',{name:'Grid'}).click();
  await page.getByTestId('button-export').click();
});

const generate = async (page:Page, preset:string) => {
  await page.getByTestId(`export-date-preset-${preset}`).click();
  await page.getByTestId('button-export-generate').click();
  const image=page.getByTestId('export-preview-image');
  await expect(image).toBeVisible({timeout:30_000});
  const result=await image.evaluate((img:HTMLImageElement)=>({width:img.naturalWidth,height:img.naturalHeight,src:img.src}));
  expect(result.width).toBeGreaterThan(0); expect(result.height).toBeGreaterThan(0); expect(result.src).toMatch(/^data:image\/png;base64,.+/);
  return result;
};

for (const [preset,lastIncluded,firstExcluded] of [['next7',6,7],['next14',13,14],['next30',29,30]] as const) {
  test(`${preset} uses today forward and generates a real PNG`, async ({page}) => {
    await page.getByTestId(`export-date-preset-${preset}`).click();
    const target=page.getByTestId('targeted-export-grid');
    await expect(target.getByTestId(`targeted-export-day-${iso(0)}`)).toHaveCount(1);
    await expect(target.getByTestId(`targeted-export-event-${iso(lastIncluded)}-day-${lastIncluded}`)).toHaveCount(1);
    await expect(target.getByTestId(`targeted-export-day-${iso(firstExcluded)}`)).toHaveCount(0);
    await expect(target).not.toContainText('Recognizable private');
    await generate(page,preset);
  });
}

test('Custom strictly clips multi-day events and Category selection', async ({page}) => {
  await page.getByTestId('export-date-preset-custom').click();
  await page.getByTestId('input-export-start').fill(iso(1)); await page.getByTestId('input-export-end').fill(iso(2));
  await page.getByRole('button',{name:'Work',exact:true}).click();
  const target=page.getByTestId('targeted-export-grid');
  await expect(target.getByTestId(`targeted-export-event-${iso(1)}-multi`)).toHaveCount(1);
  await expect(target.getByTestId(`targeted-export-event-${iso(2)}-multi`)).toHaveCount(1);
  await expect(target).not.toContainText('Recognizable other-category');
  await generate(page,'custom');
});

test('short cross-year Custom range generates both years', async ({page}) => {
  await page.getByTestId('export-date-preset-custom').click();
  await page.getByTestId('input-export-start').fill('2026-12-28'); await page.getByTestId('input-export-end').fill('2027-01-06');
  await expect(page.getByText(/2026-12-28 → 2027-01-06/).first()).toBeVisible();
  await expect(page.getByText(/Choose dates inside/)).toHaveCount(0);
  await expect(page.getByTestId('targeted-export-day-2026-12-30')).toHaveCount(1);
  await expect(page.getByTestId('targeted-export-day-2027-01-02')).toHaveCount(1);
  await generate(page,'custom');
});

test('empty targeted range still generates a PNG', async ({page}) => {
  await page.getByTestId('export-date-preset-custom').click();
  await page.getByTestId('input-export-start').fill('2027-03-01'); await page.getByTestId('input-export-end').fill('2027-03-02');
  await expect(page.getByTestId('targeted-export-empty')).toContainText('No matching events');
  await generate(page,'custom');
});

test('Next 7 downloads a non-empty PNG with deterministic range filename @chromium-native', async ({page}) => {
  await generate(page,'next7');
  const pending=page.waitForEvent('download'); await page.getByTestId('button-export-download').click(); const download=await pending;
  expect(download.suggestedFilename()).toContain(`${iso(0)}-${iso(6)}`);
  const path=await download.path(); expect(path).toBeTruthy();
  const bytes=await readFile(path!); expect(bytes.length).toBeGreaterThan(8); expect([...bytes.subarray(0,8)]).toEqual([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
});
