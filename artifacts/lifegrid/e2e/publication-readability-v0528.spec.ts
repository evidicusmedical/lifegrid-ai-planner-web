import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe.configure({ retries: 0 });
test.setTimeout(90_000);
const TODAY='2026-08-30';
const longTitle='Drop off Natalie before Chicago trip';
const event=(id:string,date:string,title=id,extra:Record<string,unknown>={})=>({id,date,endDate:date,title,category:'work',projectId:null,timeStatus:'all-day',startTime:null,endTime:null,color:'#2563eb',notes:null,displayPriority:4,showInGrid:true,showInExport:true,linkedTaskIds:[],aiNotes:null,sourceNotes:null,...extra});
const seed={
 events:[event('short-title','2026-08-31',longTitle),event('exceptional','2026-08-30','A very long descriptive sentence containing detailed contextual information that belongs in notes rather than a calendar title'),event('jan31','2026-01-31','January final day'),event('mar31','2026-03-31',longTitle),event('dec31','2026-12-31','December event'),event('jan1','2027-01-01','January event'),event('cross','2026-12-31','Cross-year source',{endDate:'2027-01-02'}),event('leap','2028-02-29','Leap-day event'),event('inside-partial','2026-09-20','Inside partial range'),event('outside-before','2026-09-19','Outside before'),event('outside-after','2027-03-11','Outside after'),event('personal','2026-10-02','Personal event',{category:'personal',color:'#16a34a'}),event('hidden-export','2026-10-03','Never publish',{showInExport:false}),event('project-direct','2026-10-04','Project direct',{projectId:'project-a'}),event('project-derived','2026-10-05','Project derived',{linkedTaskIds:['task-a']})],
 tasks:[{id:'task-a',name:'Project-linked task',category:'work',dueDate:null,status:'todo',owner:'',nextAction:null,notes:null,priority:'medium',projectId:'project-a',dueDateType:'someday-backlog',triageStatus:'ready',parentTaskId:null,linkedEventIds:['project-derived']}], personEvents:[], people:[], milestones:[],
 categories:[{id:'work',label:'Work',color:'#2563eb'},{id:'personal',label:'Personal',color:'#16a34a'}],
 projects:[{id:'project-a',name:'Project A',color:'#2563eb',order:0,aliases:[],status:'active',notes:null},{id:'project-b',name:'Project B',color:'#16a34a',order:1,aliases:[],status:'active',notes:null}],
};

test.beforeEach(async({page})=>{
 await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
 await page.addInitScript(data=>{if(!localStorage.getItem('lifegrid_store_v5'))localStorage.setItem('lifegrid_store_v5',JSON.stringify({activeCalendarId:'v0527',calendars:[{id:'v0527',name:'Convergence Calendar',createdAt:'2026-08-30T12:00:00.000Z',data}]}));},seed);
 await page.goto('/#grid'); await expect(page.getByTestId('grid-content')).toHaveAttribute('aria-busy','false');
});
const monthKeys=(page:Page)=>page.locator('thead [data-month-key]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-month-key')));
const expectMonthKeys=(page:Page,expected:string[])=>expect.poll(()=>monthKeys(page),{timeout:10_000}).toEqual(expected);
const shiftStart=async(page:Page,count:number)=>{const id=count>=0?'button-month-next':'button-month-prev';for(let i=0;i<Math.abs(count);i++)await page.getByTestId(id).click();};
const openExport=async(page:Page,preset:string)=>{await page.getByTestId('button-export').click();await page.getByTestId(`export-date-preset-${preset}`).click();};
const expectRange=async(page:Page,start:string,end:string)=>expect(page.getByTestId('export-filter-summary').first()).toContainText(`${start} → ${end}`);
const generate=async(page:Page,testInfo:TestInfo,options:{layout:'month-columns'|'targeted',inspect?:()=>Promise<void>})=>{
 await page.getByTestId('button-export-generate').click();
 if(options.layout==='month-columns') await expect(page.locator('[data-publication-ready="true"] table[data-publication-layout="month-columns"]')).toBeVisible({timeout:10_000});
 else await expect(page.getByTestId('targeted-export-grid')).toHaveAttribute('data-publication-ready','true',{timeout:10_000});
 await expect(page.getByTestId('grid-export-status')).toHaveAttribute('data-export-status','ready',{timeout:45_000});
 const image=page.getByTestId('export-preview-image'); await expect(image).toBeVisible();
 if(options.inspect) await options.inspect();
 const dimensions=await image.evaluate((node:HTMLImageElement)=>({width:node.naturalWidth,height:node.naturalHeight,src:node.src})); expect(dimensions.width).toBeGreaterThan(0);expect(dimensions.height).toBeGreaterThan(0);expect(dimensions.src).toMatch(/^data:image\/png;base64,/);
 const downloadPromise=page.waitForEvent('download');await page.getByTestId('button-export-download').click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^lifegrid-convergence-calendar-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.png$/);
 if(testInfo.project.name==='chromium'){const path=await download.path();expect(path).not.toBeNull();const bytes=await readFile(path!);expect([...bytes.subarray(0,8)]).toEqual([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);}
 await page.getByTestId('button-export-close').click();
};



test('Calendar Year from February uses export month lengths, adaptive wrapping, and a real long PNG',async({page},testInfo)=>{await shiftStart(page,1);await openExport(page,'calendarYear');await expectRange(page,'2026-01-01','2026-12-31');await generate(page,testInfo,{layout:'month-columns',inspect:async()=>{await expect(page.getByTestId('cell-2026-01-31').getByTestId('event-pill-jan31')).toBeVisible();const title=page.getByTestId('cell-2026-03-31').getByTestId('event-pill-mar31');await expect(title).toHaveAttribute('data-export-title-lines',/^[2-9]/);await expect(title).toHaveAttribute('data-publication-event','true');const style=await title.locator('[data-publication-event-title="true"]').evaluate(node=>{const css=getComputedStyle(node);return{whiteSpace:css.whiteSpace,height:(node.parentElement as HTMLElement).offsetHeight,classes:node.className}});expect(style.whiteSpace).toBe('normal');expect(style.height).toBeGreaterThan(10);expect(style.classes).not.toContain('truncate');const geometry=await page.getByTestId('export-month-publication').evaluate(node=>{const publication=node.getBoundingClientRect();const tableElement=node.querySelector('table')!;const tableRect=tableElement.getBoundingClientRect();const css=getComputedStyle(node);return{clientWidth:(node as HTMLElement).clientWidth,scrollWidth:(node as HTMLElement).scrollWidth,publicationWidth:publication.width,tableWidth:tableRect.width,paddingLeft:parseFloat(css.paddingLeft),paddingRight:parseFloat(css.paddingRight),left:tableRect.left-publication.left,right:publication.right-tableRect.right,profile:(node as HTMLElement).dataset.publicationTextProfile,layout:tableElement.getAttribute('data-publication-layout'),header:Boolean(node.querySelector('[data-testid=export-publication-header]'))};});await testInfo.attach('annual-publication-geometry',{body:JSON.stringify(geometry,null,2),contentType:'application/json'});expect(geometry.tableWidth).toBeCloseTo(1352,0);expect(geometry.publicationWidth).toBeCloseTo(1400,0);expect(Math.abs(geometry.left-geometry.paddingLeft)).toBeLessThanOrEqual(2);expect(Math.abs(geometry.right-geometry.paddingRight)).toBeLessThanOrEqual(2);expect(Math.abs(geometry.left-geometry.right)).toBeLessThanOrEqual(2);expect(geometry.publicationWidth-geometry.tableWidth).toBeLessThan(60);expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth+2);expect(geometry.layout).toBe('month-columns');expect(geometry.header).toBe(true);}});await expect(page.getByTestId('event-pill-mar31').locator('[data-publication-event-title="false"]')).toHaveClass(/truncate/);});

test('Q1 from February retains Jan 31 and Mar 31 in a real month-column PNG',async({page},testInfo)=>{await shiftStart(page,1);await openExport(page,'q1');await expectRange(page,'2026-01-01','2026-03-31');await generate(page,testInfo,{layout:'month-columns',inspect:async()=>{await expectMonthKeys(page,['2026-01','2026-02','2026-03']);await expect(page.getByTestId('cell-2026-01-31').getByText('January final day')).toBeVisible();await expect(page.getByTestId('cell-2026-03-31').getByText(longTitle)).toBeVisible();const title=page.getByTestId('cell-2026-03-31').getByTestId('event-pill-mar31').locator('[data-publication-event-title=true]');const metrics=await title.evaluate((node:HTMLElement)=>({text:node.textContent?.trim(),clientHeight:node.clientHeight,scrollHeight:node.scrollHeight}));expect(metrics.text).toBe(longTitle);expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight+2);}});});





test('short range preserves every structural date and generates a real PNG',async({page},testInfo)=>{await openExport(page,'custom');await page.getByTestId('input-export-start').fill('2026-08-29');await page.getByTestId('input-export-end').fill('2026-09-04');for(const date of ['2026-08-29','2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04'])await expect(page.getByTestId(`targeted-export-day-${date}`)).toBeAttached();await generate(page,testInfo,{layout:'targeted',inspect:async()=>{for(const date of ['2026-08-29','2026-08-30','2026-08-31','2026-09-01','2026-09-02','2026-09-03','2026-09-04']){const cell=page.getByTestId(`targeted-export-day-${date}`);await expect(cell.locator('[data-publication-month]')).toHaveText(date<'2026-09-01'?'Aug':'Sep');await expect(cell.locator('[data-publication-day]')).toHaveText(String(Number(date.slice(-2))));}await expect(page.getByText(/Aug …|Se…/)).toHaveCount(0);const title=page.getByTestId('targeted-export-event-2026-08-31-short-title').locator('[data-publication-event-title=true]');const metrics=await title.evaluate((node:HTMLElement)=>({text:node.textContent?.trim(),clientHeight:node.clientHeight,scrollHeight:node.scrollHeight}));expect(metrics.text).toBe(longTitle);expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight+2);const exceptional=page.getByTestId('targeted-export-event-2026-08-30-exceptional');await expect(exceptional).toBeVisible();const date=page.getByTestId('targeted-export-day-2026-08-30').locator('[data-publication-date]');await expect(date).toBeVisible();const boxes=await Promise.all([exceptional.boundingBox(),date.boundingBox()]);expect(boxes[0]!.y).toBeGreaterThanOrEqual(boxes[1]!.y+boxes[1]!.height);}});});


test('export panel remains simplified and current month label is not a dead button',async({page})=>{expect(await page.getByTestId('button-month-current').evaluate(node=>node.tagName)).toBe('SPAN');await page.getByTestId('button-export').click();const panel=page.getByTestId(/panel-export/);for(const label of ['Current Grid','Calendar Year','Q1','Q2','Q3','Q4','Next 7','Next 14','Next 30','Custom'])await expect(panel.getByText(label,{exact:true})).toBeVisible();for(const label of ['Visible','Expanded','Fast','Sharp','Compact','Detailed'])await expect(panel.getByText(label,{exact:true})).toHaveCount(0);});

test('targeted publication readiness persists through preview and clears on close',async({page})=>{
 await openExport(page,'custom');
 await page.getByTestId('input-export-start').fill('2026-08-29');
 await page.getByTestId('input-export-end').fill('2026-09-04');
 const publication=page.getByTestId('targeted-export-grid');
 await expect(publication).toHaveAttribute('data-publication-ready','false');
 await page.getByTestId('button-export-generate').click();
 await expect(publication).toHaveAttribute('data-publication-ready','true',{timeout:10_000});
 await expect(page.getByTestId('export-preview-image')).toBeVisible({timeout:45_000});
 await expect(publication).toHaveAttribute('data-publication-ready','true');
 await page.getByTestId('button-export-close').click();
 await expect(publication).toHaveCount(0);
});
