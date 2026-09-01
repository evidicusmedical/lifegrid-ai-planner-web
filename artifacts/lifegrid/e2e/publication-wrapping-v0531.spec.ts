import { expect, test, type Page, type TestInfo } from '@playwright/test';

test.describe.configure({ retries: 0 });
test.setTimeout(90_000);

const labels=['USAF','Fun','Admin','Family','Health','Holidays','Langley ED Shifts','USACS and Moonlighting','Relationship / Wife','Requested Day Off','Certification, Credentials and Continuing Education'];
const titles=['Dietician Class for Starting GLP 1','Drop off Natalie before Chicago trip','USACS New Hire Onboarding meeting (PT 1099)','Requested day off - spouse visit planning','This intentionally excessive sentence length title contains far more explanatory prose than the publication card can display while retaining its date and time and equal geometry','ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const categories=labels.map((label,index)=>({id:`category-${index}`,label,color:['#2563eb','#16a34a','#dc2626'][index%3]}));
const events=labels.map((_,index)=>({id:`event-${index}`,date:`2026-09-${String(index+1).padStart(2,'0')}`,endDate:`2026-09-${String(index+1).padStart(2,'0')}`,title:titles[index]??`Represented event ${index}`,category:`category-${index}`,projectId:null,timeStatus:'all-day',startTime:null,endTime:null,color:categories[index].color,notes:null,displayPriority:4,showInGrid:true,showInExport:true,linkedTaskIds:[],aiNotes:null,sourceNotes:null}));

test.beforeEach(async({page})=>{
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await page.addInitScript(data=>{
    (window as Window & {__fillTexts?:string[]}).__fillTexts=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){(window as Window & {__fillTexts?:string[]}).__fillTexts?.push(String(text));return original.call(this,text,...args as [number,number,number?]);};
    if(!localStorage.getItem('lifegrid_store_v5')) localStorage.setItem('lifegrid_store_v5',JSON.stringify({activeCalendarId:'v0531',calendars:[{id:'v0531',name:'Wrapping Calendar',createdAt:'2026-09-01T00:00:00.000Z',data}]}));
  },{events,tasks:[],personEvents:[],people:[],milestones:[],categories,projects:[]});
  await page.goto('/#grid');
  await expect(page.getByTestId('grid-content')).toHaveAttribute('aria-busy','false');
});

const open=async(page:Page,preset:string)=>{await page.getByTestId('button-export').click();await page.getByTestId(`export-date-preset-${preset}`).click();};
const png=async(page:Page)=>{await page.getByTestId('button-export-generate').click();await expect(page.getByTestId('grid-export-status')).toHaveAttribute('data-export-status','ready',{timeout:45_000});const image=page.getByTestId('export-preview-image');await expect(image).toBeVisible();expect(await image.getAttribute('src')).toMatch(/^data:image\/png;base64,/);};

test('natural legend, event titles, and compact September month matrix produce a real PNG',async({page},testInfo:TestInfo)=>{
  await open(page,'currentMonth');
  const root=page.getByTestId('targeted-export-grid');
  await expect(root).toHaveAttribute('data-publication-layout','month-matrix');
  await expect(root.locator('thead th')).toHaveText(['Sun','Mon','Tue','Wed','Thu','Fri','Sat']);
  const tableMetrics=await root.locator('table').evaluate(table=>{const head=table.querySelector('thead')!.getBoundingClientRect();const body=table.querySelector('tbody tr')!.getBoundingClientRect();return{headHeight:head.height,gap:body.top-head.bottom,tableBottom:table.getBoundingClientRect().bottom,rootBottom:table.parentElement!.getBoundingClientRect().bottom};});
  expect(tableMetrics.headHeight).toBeLessThan(50);expect(Math.abs(tableMetrics.gap)).toBeLessThanOrEqual(4);expect(tableMetrics.rootBottom-tableMetrics.tableBottom).toBeGreaterThan(0);
  const september1=page.getByTestId('targeted-export-day-2026-09-01');expect(await september1.evaluate(node=>node.cellIndex)).toBe(2);
  for(const label of labels.slice(0,6)){const node=root.locator('[data-publication-legend-label]',{hasText:label}).first();await expect(node).toHaveText(label);const height=await node.evaluate(element=>element.getBoundingClientRect().height);expect(height).toBeLessThanOrEqual(18);}
  const title=root.locator('[data-publication-event-title]',{hasText:titles[0]}).first();await expect(title).toHaveText(titles[0]);expect((await title.textContent())?.split(/\s+/).join(' ')).toBe(titles[0]);
  await png(page);
  if(testInfo.project.name==='firefox'){const calls=await page.evaluate(()=>(window as Window & {__fillTexts?:string[]}).__fillTexts??[]);for(const label of labels.slice(0,6))expect(calls).toContain(label);expect(calls).not.toEqual(expect.arrayContaining(['Fu','n','Admi','Famil','Holiday']));expect(calls.at(-1)).not.toBe('1');}
});

test('Next 7, Next 14, and Next 30 preserve exact dates and equal row geometry',async({page})=>{
  for(const [preset,count] of [['next7',7],['next14',14],['next30',30]] as const){await open(page,preset);const root=page.getByTestId('targeted-export-grid');await expect(root.locator('[data-publication-date]')).toHaveCount(count);const heights=await root.locator('tbody tr').evaluateAll(rows=>rows.map(row=>Math.round(row.getBoundingClientRect().height)));expect(new Set(heights).size).toBe(1);await png(page);await page.getByTestId('button-export-close').click();}
});
