import { test, expect } from '@playwright/test';
const seedLifeGrid = async (page) => page.addInitScript(() => {
  const date = new Date(); date.setHours(12,0,0,0); const iso = (offset) => { const d=new Date(date); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); };
  const category={id:'other',label:'Other',color:'#ffff1a'};
  const event={id:'e2e-multiday',date:iso(0),endDate:iso(2),title:'E2E multi-day event',category:'other',projectId:'e2e-project',timeStatus:'all-day',startTime:null,endTime:null,color:'#ffff1a',notes:'Selectable long notes '.repeat(80),displayPriority:4,showInGrid:true,showInExport:true,linkedTaskIds:[],aiNotes:null,sourceNotes:null};
  const data={events:[event],tasks:[],personEvents:[],categories:[category],people:[{id:'person',label:'Person',color:'#123456',order:0}],projects:[{id:'e2e-project',name:'E2E Project',color:'#123456',order:0,aliases:[],status:'active',notes:null}],milestones:[]};
  localStorage.setItem('lifegrid_store_v5',JSON.stringify({activeCalendarId:'e2e-calendar',calendars:[{id:'e2e-calendar',name:'E2E Calendar',createdAt:new Date().toISOString(),data}]}));
});

test.beforeEach(async ({page}) => seedLifeGrid(page));

test.describe('v0.5.23 browser contracts', () => {
  test('task status row is single select and image Export toggles', async ({ page }) => { await page.goto('/'); await page.getByRole('button',{name:'Tasks'}).click(); const done=page.getByTestId('task-status-done'); await done.click(); await expect(done).toHaveAttribute('aria-checked','true'); await page.getByTestId('task-status-all').click(); await expect(done).toHaveAttribute('aria-checked','false'); await page.getByRole('button',{name:'Grid'}).click(); const button=page.getByRole('button',{name:/Export/}).first(); await button.click(); await expect(page.getByTestId('panel-export-options')).toBeVisible(); await button.click(); await expect(page.getByTestId('panel-export-options')).toBeHidden(); });
  test('new Event exposes two times and exclusive multi-day/repeat', async ({ page }) => { await page.goto('/'); await page.getByTestId('button-add-event').click(); await expect(page.getByTestId('event-time-type')).toHaveCount(2); const multi=page.getByTestId('switch-multiday'), repeat=page.getByTestId('switch-repeat'); await multi.click(); await expect(repeat).toBeDisabled(); });
});

test.describe('v0.5.23 production integration', () => {
  test('complete AI export is default and Advanced explains restricted scope', async ({ page }) => {
    await page.goto('/'); await page.getByRole('button',{name:/AI/}).click();
    await expect(page.getByText(/All data/i).first()).toBeVisible();
    const advanced=page.getByText(/Advanced/i).first(); await advanced.click();
    await expect(page.getByText(/lose context outside|reduce.*file size/i)).toBeVisible();
  });
  test('Export closes outside and with Escape', async ({ page }) => {
    await page.goto('/'); const button=page.getByRole('button',{name:/Export/}).first(); await button.click(); await expect(page.getByTestId('panel-export-options')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(page.getByTestId('panel-export-options')).toBeHidden(); await button.click(); await page.locator('body').click({position:{x:5,y:5}}); await expect(page.getByTestId('panel-export-options')).toBeHidden();
  });
  test('normal Event hover transfers into selectable preview and Escape dismisses', async ({ page }) => {
    await page.goto('/'); const event=page.getByTestId('event-pill-e2e-multiday').first();
    await event.hover(); const preview=page.getByTestId('grid-event-preview'); await expect(preview).toBeVisible(); await preview.hover(); await page.waitForTimeout(250); await expect(preview).toBeVisible(); await preview.focus(); await page.keyboard.press(process.platform==='darwin'?'Meta+A':'Control+A'); await expect.poll(()=>page.evaluate(()=>window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0); await page.keyboard.press('Escape'); await expect(preview).toBeHidden();
  });
  test('Grid Event opens complete Day Detail', async ({ page }) => {
    await page.goto('/'); const event=page.getByTestId('event-pill-e2e-multiday').nth(1); await event.click(); await expect(page.getByTestId('day-detail-sheet')).toBeVisible(); await page.getByTestId('day-event-e2e-multiday').click(); await expect(page.getByRole('heading',{name:/Edit Event/i})).toBeVisible();
  });
  test('Event and Person schedule editors expose only All day and Timed', async ({ page }) => {
    await page.goto('/'); await page.getByTestId('button-add-event').click(); await expect(page.getByText('All day',{exact:true})).toBeVisible(); await expect(page.getByText('Timed',{exact:true})).toBeVisible(); await expect(page.getByText('Approximate',{exact:true})).toHaveCount(0); await expect(page.getByText('Unknown',{exact:true})).toHaveCount(0);
  });
});
