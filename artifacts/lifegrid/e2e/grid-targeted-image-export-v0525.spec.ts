import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test.describe.configure({ retries: 0 });

const TODAY = '2026-08-20';
const at = (offset: number) => {
  const date = new Date(`${TODAY}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

const makeEvent = (
  id: string,
  offset: number,
  category = 'work',
  overrides: Record<string, unknown> = {},
) => ({
  id,
  date: at(offset),
  endDate: at(offset),
  title: `Recognizable ${id}`,
  category,
  projectId: null,
  timeStatus: 'all-day',
  startTime: null,
  endTime: null,
  color: category === 'work' ? '#2563eb' : '#16a34a',
  notes: null,
  displayPriority: 4,
  showInGrid: true,
  showInExport: true,
  linkedTaskIds: [],
  aiNotes: null,
  sourceNotes: null,
  ...overrides,
});

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
  const data = {
    events: [
      makeEvent('today', 0),
      makeEvent('tomorrow', 1),
      makeEvent('day-6', 6),
      makeEvent('day-7', 7),
      makeEvent('day-13', 13),
      makeEvent('day-14', 14),
      makeEvent('day-29', 29),
      makeEvent('day-30', 30),
      makeEvent('other-category', 2, 'personal'),
      makeEvent('project-direct', 4, 'work', { projectId: 'project' }),
      makeEvent('project-derived', 5, 'work', { linkedTaskIds: ['project-task'] }),
      makeEvent('multi-day', -2, 'work', { endDate: at(3) }),
      makeEvent('outside-range', 60),
      makeEvent('private-reference', 3, 'work', {
        title: 'Private reference event',
        showInExport: false,
      }),
      {
        ...makeEvent('cross-year', 0),
        date: '2026-12-30',
        endDate: '2027-01-02',
      },
    ],
    tasks: [{
      id: 'project-task',
      name: 'Project-derived linked task',
      category: 'work',
      dueDate: null,
      status: 'todo',
      owner: '',
      nextAction: null,
      notes: null,
      priority: 'medium',
      projectId: 'project',
      dueDateType: 'someday-backlog',
      triageStatus: 'ready',
      parentTaskId: null,
      linkedEventIds: ['project-derived'],
    }],
    personEvents: [],
    categories: [
      { id: 'work', label: 'Work', color: '#2563eb' },
      { id: 'personal', label: 'Personal', color: '#16a34a' },
    ],
    people: [],
    projects: [{
      id: 'project',
      name: 'Project Alpha',
      color: '#2563eb',
      order: 0,
      aliases: [],
      status: 'active',
      notes: null,
    }],
    milestones: [],
  };
  await page.addInitScript((seed) => {
    localStorage.setItem('lifegrid_store_v5', JSON.stringify({
      activeCalendarId: 'export-calendar',
      calendars: [{
        id: 'export-calendar',
        name: "Jon's Calendar",
        createdAt: '2026-08-20T12:00:00.000Z',
        data: seed,
      }],
    }));
  }, data);
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid' }).click();
  await page.getByTestId('button-export').click();
});

const selectPreset = async (page: Page, preset: string, start: string, end: string) => {
  await page.getByTestId(`export-date-preset-${preset}`).click();
  await expect(page.getByTestId('export-filter-summary')).toContainText(
    `${start} → ${end} · All tags · All projects`,
  );
};

const generateRealPng = async (page: Page) => {
  await page.getByTestId('button-export-generate').click();
  const image = page.getByTestId('export-preview-image');
  await expect(image).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => ({
    width: node.naturalWidth,
    height: node.naturalHeight,
    source: node.currentSrc || node.src,
  }))).toMatchObject({
    width: expect.any(Number),
    height: expect.any(Number),
    source: expect.stringMatching(/^data:image\/png;base64,.+/),
  });
  const dimensions = await image.evaluate((node: HTMLImageElement) => ({
    width: node.naturalWidth,
    height: node.naturalHeight,
    sourceLength: (node.currentSrc || node.src).length,
  }));
  expect(dimensions.width).toBeGreaterThan(0);
  expect(dimensions.height).toBeGreaterThan(0);
  expect(dimensions.sourceLength).toBeGreaterThan('data:image/png;base64,'.length);
};

for (const [preset, days, includedId, excludedId] of [
  ['next7', 7, 'day-6', 'day-7'],
  ['next14', 14, 'day-13', 'day-14'],
  ['next30', 30, 'day-29', 'day-30'],
] as const) {
  test(`${preset} represents only today through day ${days - 1} in a real PNG`, async ({ page }) => {
    await selectPreset(page, preset, TODAY, at(days - 1));
    const target = page.getByTestId('targeted-export-grid');
    await expect(target.getByTestId(`targeted-export-event-${TODAY}-today`)).toHaveCount(1);
    await expect(target.getByTestId(`targeted-export-event-${at(1)}-tomorrow`)).toHaveCount(1);
    await expect(target.getByTestId(`targeted-export-event-${at(days - 1)}-${includedId}`)).toHaveCount(1);
    await expect(target.getByTestId(`targeted-export-day-${at(days)}`)).toHaveCount(0);
    await expect(target).not.toContainText(`Recognizable ${excludedId}`);
    await expect(target).not.toContainText('Recognizable outside-range');
    await expect(target).not.toContainText('Private reference event');
    await generateRealPng(page);
  });
}

test('Custom clips a multi-day Event and keeps Category controls authoritative', async ({ page }) => {
  await page.getByTestId('export-date-preset-custom').click();
  await page.getByTestId('input-export-start').fill(at(1));
  await page.getByTestId('input-export-end').fill(at(2));
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await expect(page.getByTestId('export-filter-summary')).toContainText(`${at(1)} → ${at(2)} · 1 tag · All projects`);
  const target = page.getByTestId('targeted-export-grid');
  await expect(target.getByTestId(`targeted-export-event-${at(1)}-multi-day`)).toHaveCount(1);
  await expect(target.getByTestId(`targeted-export-event-${at(2)}-multi-day`)).toHaveCount(1);
  await expect(target.getByTestId(`targeted-export-day-${TODAY}`)).toHaveCount(0);
  await expect(target.getByTestId(`targeted-export-day-${at(3)}`)).toHaveCount(0);
  await expect(target).not.toContainText('Recognizable other-category');
  await generateRealPng(page);
});

test('Project filter includes direct and Task-derived Event relationships', async ({ page }) => {
  await selectPreset(page, 'next7', TODAY, at(6));
  await page.getByTestId('select-export-project').selectOption('project');
  await expect(page.getByTestId('export-filter-summary')).toContainText('All tags · Project Alpha');
  const target = page.getByTestId('targeted-export-grid');
  await expect(target).toContainText('Recognizable project-direct');
  await expect(target).toContainText('Recognizable project-derived');
  await expect(target).not.toContainText('Recognizable today');
  await generateRealPng(page);
});

test('short cross-year Custom range generates a real PNG with both years', async ({ page }) => {
  await page.getByTestId('export-date-preset-custom').click();
  await page.getByTestId('input-export-start').fill('2026-12-28');
  await page.getByTestId('input-export-end').fill('2027-01-06');
  await expect(page.getByTestId('export-filter-summary')).toContainText('2026-12-28 → 2027-01-06');
  await expect(page.getByText(/Choose dates inside the 2026 grid/)).toHaveCount(0);
  await expect(page.getByTestId('targeted-export-day-2026-12-30')).toHaveCount(1);
  await expect(page.getByTestId('targeted-export-day-2027-01-02')).toHaveCount(1);
  await generateRealPng(page);
});

test('showInExport false is absent from targeted publication, legend, and count', async ({ page }) => {
  await selectPreset(page, 'next7', TODAY, at(6));
  const target = page.getByTestId('targeted-export-grid');
  await expect(target).not.toContainText('Private reference event');
  await expect(target.getByText('Work')).toHaveCount(1);
  await expect(page.getByTestId('export-publication-summary')).toContainText('7 records · 2 categories');
  await generateRealPng(page);
});

test('Current Grid publication and record count exclude showInExport false @chromium-native', async ({ page }) => {
  await expect(page.getByTestId('export-publication-summary')).toContainText('14 records · 2 categories');
  await generateRealPng(page);
});

test('empty targeted range retains its requested cells and generates a real PNG', async ({ page }) => {
  await page.getByTestId('export-date-preset-custom').click();
  await page.getByTestId('input-export-start').fill('2027-03-01');
  await page.getByTestId('input-export-end').fill('2027-03-02');
  await expect(page.getByTestId('targeted-export-day-2027-03-01')).toHaveCount(1);
  await expect(page.getByTestId('targeted-export-day-2027-03-02')).toHaveCount(1);
  await expect(page.getByTestId('targeted-export-empty')).toContainText('No matching events in this range.');
  await expect(page.getByTestId('targeted-export-grid').locator('[data-source-event-id]')).toHaveCount(0);
  await generateRealPng(page);
});

test('Next 7 downloads a non-empty PNG with a range filename @chromium-native', async ({ page }) => {
  await selectPreset(page, 'next7', TODAY, at(6));
  await generateRealPng(page);
  const pendingDownload = page.waitForEvent('download');
  await page.getByTestId('button-export-download').click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe(`lifegrid-jon-s-calendar-${TODAY}-${at(6)}.png`);
  const path = await download.path();
  expect(path).toBeTruthy();
  const bytes = await readFile(path!);
  expect(bytes.length).toBeGreaterThan(8);
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
});
