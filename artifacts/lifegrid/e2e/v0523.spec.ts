import { test, expect, type Page } from '@playwright/test';

const seedLifeGrid = async (page: Page) => page.addInitScript(() => {
  const base = new Date(); base.setHours(12,0,0,0);
  const iso = (offset: number) => { const date=new Date(base); date.setDate(date.getDate()+offset); return date.toISOString().slice(0,10); };
  const event={id:'e2e-multiday',date:iso(0),endDate:iso(2),title:'E2E multi-day event',category:'other',projectId:'e2e-project',timeStatus:'all-day',startTime:null,endTime:null,color:'#ffff1a',notes:'Selectable long notes '.repeat(80),displayPriority:4,showInGrid:true,showInExport:true,linkedTaskIds:[],aiNotes:null,sourceNotes:null};
  const data={events:[event],tasks:[],personEvents:[],categories:[{id:'other',label:'Other',color:'#ffff1a'}],people:[{id:'person',label:'E2E Person',color:'#123456',order:0}],projects:[{id:'e2e-project',name:'E2E Project',color:'#123456',order:0,aliases:[],status:'active',notes:null}],milestones:[]};
  localStorage.setItem('lifegrid_store_v5',JSON.stringify({activeCalendarId:'e2e-calendar',calendars:[{id:'e2e-calendar',name:'E2E Calendar',createdAt:new Date().toISOString(),data}]}));
});
const emulateFinePointer = async (page: Page) => page.addInitScript(() => {
  const original=window.matchMedia.bind(window);
  window.matchMedia=(query:string) => {
    if (['(hover: hover)','(any-hover: hover)','(pointer: fine)','(any-pointer: fine)'].includes(query)) return {...original(query),matches:true,media:query} as MediaQueryList;
    if (['(hover: none)','(pointer: coarse)'].includes(query)) return {...original(query),matches:false,media:query} as MediaQueryList;
    return original(query);
  };
});
const dateAt = (offset:number) => { const date=new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()+offset); return date.toISOString().slice(0,10); };

test.beforeEach(async ({page}) => seedLifeGrid(page));

test('task status is single-select and Export toggles', async ({page}) => { await page.goto('/');await page.getByRole('button',{name:'Tasks'}).click();const done=page.getByTestId('task-status-done');await done.click();await expect(done).toHaveAttribute('aria-checked','true');await page.getByTestId('task-status-all').click();await expect(done).toHaveAttribute('aria-checked','false');await page.getByRole('button',{name:'Grid'}).click();const button=page.getByRole('button',{name:/Export/}).first();await button.click();await expect(page.getByTestId('panel-export-options')).toBeVisible();await button.click();await expect(page.getByTestId('panel-export-options')).toBeHidden();});

test('Multi-day and Repeat stay visible, exclusive, and Multi-day saves one record', async ({page}) => {
  await page.goto('/');await page.getByTestId('button-add-event').click();const sheet=page.getByTestId('event-sheet');const multi=sheet.getByTestId('switch-multiday'),repeat=sheet.getByTestId('switch-repeat');await expect(multi).toHaveCount(1);await expect(repeat).toHaveCount(1);await multi.click();await expect(multi).toHaveAttribute('data-state','checked');await expect(repeat).toHaveAttribute('data-state','unchecked');await expect(repeat).toBeDisabled();await multi.click();await expect(repeat).toBeEnabled();await repeat.click();await expect(repeat).toHaveAttribute('data-state','checked');await expect(multi).toBeDisabled();await repeat.click();await multi.click();await sheet.getByPlaceholder('Event title').fill('Saved one multi-day Event');await sheet.getByTestId('input-end-date').fill(dateAt(2));await expect(sheet.getByTestId('multiday-span-summary')).toContainText('as one Event');await sheet.getByRole('button',{name:'Create Multi-day Event'}).click();
  await expect.poll(()=>page.evaluate(() => {const store=JSON.parse(localStorage.getItem('lifegrid_store_v5')!);return store.calendars[0].data.events.filter((event:any)=>event.title==='Saved one multi-day Event').map((event:any)=>[event.date,event.endDate]);})).toEqual([[dateAt(0),dateAt(2)]]);
});

test('AI Advanced range uses stable semantic copy and controls',async({page})=>{await page.goto('/');await page.getByRole('button',{name:/AI/}).click();const advanced=page.getByTestId('ai-export-advanced');await advanced.locator('summary').click();const explanation=page.getByTestId('ai-export-range-explanation');await expect(explanation).toContainText(/reduce file size/i);await expect(explanation).toContainText(/lose context outside the selected range/i);await page.getByTestId('ai-export-preset-custom').click();await expect(page.getByLabel('Start date')).toBeVisible();await expect(page.getByLabel('End date')).toBeVisible();});

test('desktop hover transfers, scrolls, selects only preview, exits, and Escape closes',async({page})=>{await emulateFinePointer(page);await page.goto('/');const pill=page.getByTestId('event-pill-e2e-multiday').first();await expect(pill).toBeVisible();await pill.hover();const preview=page.getByTestId('grid-event-preview');await expect(preview).toBeVisible();await preview.hover();await page.waitForTimeout(250);await expect(preview).toBeVisible();const notes=page.getByTestId('preview-notes');await notes.evaluate(element=>element.scrollTop=element.scrollHeight);expect(await notes.evaluate(element=>element.scrollTop)).toBeGreaterThan(0);await preview.focus();await page.keyboard.press(process.platform==='darwin'?'Meta+A':'Control+A');await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString()??'')).toContain('E2E multi-day event');await page.keyboard.press('Escape');await expect(preview).toBeHidden();await pill.hover();await expect(preview).toBeVisible();await page.mouse.move(0,0);await page.waitForTimeout(220);await expect(preview).toBeHidden();});

test('keyboard focus opens preview and focus transfer keeps it open',async({page})=>{await page.goto('/');const pill=page.getByTestId('event-pill-e2e-multiday').first();await pill.focus();const preview=page.getByTestId('grid-event-preview');await expect(preview).toBeVisible();await preview.focus();await page.waitForTimeout(220);await expect(preview).toBeVisible();});

test('second-day Day Detail edits original source Event',async({page})=>{
  await page.goto('/');
  const secondDate=dateAt(1);
  const secondDayCell=page.getByTestId(`cell-${secondDate}`);
  await expect(secondDayCell).toBeVisible();
  const secondDayPill=secondDayCell.getByTestId('event-pill-e2e-multiday');
  await expect(secondDayPill).toHaveCount(1);
  await expect(secondDayPill).toHaveAttribute('data-occurrence-date',secondDate);
  await secondDayPill.scrollIntoViewIfNeeded();
  await secondDayPill.click();
  const grid=page.getByTestId('grid-content');
  await expect(grid).toHaveAttribute('data-detail-date',secondDate);
  await expect(grid).toHaveAttribute('data-day-detail-open','true');
  const detail=page.getByTestId('day-detail-sheet');
  await expect(detail).toBeVisible();
  const date=new Date(`${secondDate}T12:00:00`),day=date.getDate(),mod100=day%100;
  const suffix=mod100>=11&&mod100<=13?'th':day%10===1?'st':day%10===2?'nd':day%10===3?'rd':'th';
  const expectedDate=`${date.toLocaleDateString('en-US',{weekday:'long'})}, ${date.toLocaleDateString('en-US',{month:'long'})} ${day}${suffix}`;
  await expect(detail).toContainText(expectedDate);
  await page.getByTestId('day-event-e2e-multiday').click();
  await expect(page.getByTestId('event-sheet')).toContainText('Edit Event');
  await expect(grid).toHaveAttribute('data-day-detail-open','false');
  await expect.poll(()=>page.evaluate(()=>{const events=JSON.parse(localStorage.getItem('lifegrid_store_v5')!).calendars[0].data.events.filter((event:any)=>event.id==='e2e-multiday');return events.map((event:any)=>({date:event.date,endDate:event.endDate}));})).toEqual([{date:dateAt(0),endDate:dateAt(2)}]);
});

test('exact date cell controls explicit Day Detail open state',async({page})=>{
  await page.goto('/');
  const selectedDate=dateAt(5),grid=page.getByTestId('grid-content');
  const cell=page.getByTestId(`cell-${selectedDate}`);
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(grid).toHaveAttribute('data-detail-date',selectedDate);
  await expect(grid).toHaveAttribute('data-day-detail-open','true');
  const detail=page.getByTestId('day-detail-sheet');
  await expect(detail).toBeVisible();
  await detail.getByRole('button',{name:'Close'}).click();
  await expect(grid).toHaveAttribute('data-day-detail-open','false');
  await expect(grid).toHaveAttribute('data-detail-date','');
});

test('delayed hover preview cannot reopen after Event pill activation',async({page})=>{
  await emulateFinePointer(page);await page.goto('/');
  const secondDate=dateAt(1),grid=page.getByTestId('grid-content');
  const pill=page.getByTestId(`cell-${secondDate}`).getByTestId('event-pill-e2e-multiday');
  await pill.hover();
  await pill.click();
  await expect(grid).toHaveAttribute('data-detail-date',secondDate);
  await expect(page.getByTestId('day-detail-sheet')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('grid-event-preview')).toBeHidden();
});

test('Event and Person schedule editors expose exactly All day and Timed',async({page})=>{await page.goto('/');await page.getByTestId('button-add-event').click();let sheet=page.getByTestId('event-sheet');let controls=sheet.getByTestId('event-time-type');await expect(controls).toHaveCount(2);await expect(controls).toHaveText(['All day','Timed']);await expect(sheet.getByTestId('event-time-type').filter({hasText:/Approximate|Unknown/})).toHaveCount(0);await sheet.getByTestId('button-sheet-close').click();await page.getByRole('button',{name:'People'}).click();await page.getByTestId('add-person-event-person').click();sheet=page.getByTestId('person-event-sheet');controls=sheet.getByTestId('person-schedule-time-type');await expect(controls).toHaveCount(2);await expect(controls).toHaveText(['All day','Timed']);await expect(controls.filter({hasText:/Approximate|Unknown/})).toHaveCount(0);await sheet.getByTestId('button-sheet-close').click();await expect(sheet).toBeHidden();});

test('Custom export preset stays selected and owns visible range inputs',async({page})=>{await page.goto('/');await page.getByRole('button',{name:/Export/}).first().click();const panel=page.getByTestId('panel-export-options');await expect(panel).toBeVisible();const custom=panel.getByTestId('export-date-preset-custom');await custom.click();await expect(custom).toHaveAttribute('aria-pressed','true');const start=panel.getByTestId('input-export-start'),end=panel.getByTestId('input-export-end');await expect(start).toBeVisible();await expect(end).toBeVisible();await start.fill(dateAt(1));await end.fill(dateAt(2));await expect(start).toHaveValue(dateAt(1));await expect(end).toHaveValue(dateAt(2));await expect(panel).toBeVisible();});

test('targeted export expands one source Event onto included second and third days',async({page})=>{await page.goto('/');await page.getByRole('button',{name:/Export/}).first().click();const panel=page.getByTestId('panel-export-options');const custom=panel.getByTestId('export-date-preset-custom');await custom.click();await expect(custom).toHaveAttribute('aria-pressed','true');const start=panel.getByTestId('input-export-start'),end=panel.getByTestId('input-export-end');await expect(start).toBeVisible();await expect(end).toBeVisible();await start.fill(dateAt(1));await end.fill(dateAt(2));await expect(start).toHaveValue(dateAt(1));await expect(end).toHaveValue(dateAt(2));await expect(panel).toBeVisible();const target=page.getByTestId('targeted-export-grid');await expect(target.getByTestId(`targeted-export-event-${dateAt(1)}-e2e-multiday`)).toHaveAttribute('data-source-event-id','e2e-multiday');await expect(target.getByTestId(`targeted-export-event-${dateAt(2)}-e2e-multiday`)).toHaveAttribute('data-source-event-id','e2e-multiday');await expect(target.getByTestId(`targeted-export-day-${dateAt(0)}`)).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('lifegrid_store_v5')!).calendars[0].data.events.filter((event:any)=>event.id==='e2e-multiday').length)).toBe(1);});

test('Timed Multi-day save preserves one source record and clock values',async({page})=>{await page.goto('/');await page.getByTestId('button-add-event').click();const sheet=page.getByTestId('event-sheet');await sheet.getByPlaceholder('Event title').fill('Saved timed multi-day Event');await sheet.getByTestId('event-time-type').filter({hasText:'Timed'}).click();await sheet.getByTestId('event-start-time').fill('09:15');await sheet.getByTestId('event-end-time').fill('10:45');await sheet.getByTestId('switch-multiday').click();await sheet.getByTestId('input-end-date').fill(dateAt(2));await sheet.getByRole('button',{name:'Create Multi-day Event'}).click();await expect.poll(()=>page.evaluate(()=>{const events=JSON.parse(localStorage.getItem('lifegrid_store_v5')!).calendars[0].data.events.filter((event:any)=>event.title==='Saved timed multi-day Event');return events.map((event:any)=>({date:event.date,endDate:event.endDate,timeStatus:event.timeStatus,startTime:event.startTime,endTime:event.endTime}));})).toEqual([{date:dateAt(0),endDate:dateAt(2),timeStatus:'timed',startTime:'09:15',endTime:'10:45'}]);});
