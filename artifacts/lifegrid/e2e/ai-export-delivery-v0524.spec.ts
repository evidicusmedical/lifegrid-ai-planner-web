import { expect, test, type Page } from '@playwright/test';

const CONTEXT_MARKER = 'CURRENT LIFEGRID CONTEXT\n';
const EXPECTED_COUNTS = {
  categories: 1,
  projects: 1,
  people: 1,
  events: 2,
  personEvents: 1,
  tasks: 3,
  milestones: 1,
};

const parseLifeGridContext = (text: string) => {
  const markerIndex = text.lastIndexOf(CONTEXT_MARKER);
  expect(markerIndex, 'complete package must contain its final context marker').toBeGreaterThanOrEqual(0);
  const jsonText = text.slice(markerIndex + CONTEXT_MARKER.length).trim();
  expect(jsonText, 'final context marker must be followed by JSON').not.toHaveLength(0);
  return JSON.parse(jsonText);
};

const seed = async (page: Page) => page.addInitScript(() => {
  const data = {
    categories: [{ id: 'hotfix-category', label: 'Hotfix Category', color: '#123456' }],
    projects: [{ id: 'hotfix-project', name: 'Hotfix Project', color: '#123456', order: 0, aliases: [], status: 'active', notes: null }],
    people: [{ id: 'hotfix-person', label: 'Hotfix Person', color: '#654321', order: 0 }],
    events: [
      { id: 'normal-event', date: '2026-08-01', endDate: null, title: 'Normal Event', category: 'hotfix-category' },
      { id: 'multi-event', date: '2026-07-30', endDate: '2026-08-02', title: 'Multi Event', category: 'hotfix-category' },
    ],
    personEvents: [{ id: 'schedule', person: 'hotfix-person', date: '2026-08-01', endDate: null, title: 'Schedule' }],
    tasks: [
      { id: 'dated-task', name: 'Dated', dueDate: '2026-08-01', status: 'todo' },
      { id: 'undated-task', name: 'Undated', dueDate: null, status: 'todo' },
      { id: 'completed-task', name: 'Complete', dueDate: null, status: 'done' },
    ],
    milestones: [{ id: 'milestone', title: 'Milestone', targetDate: '2026-08-01' }],
  };
  localStorage.setItem('lifegrid_store_v5', JSON.stringify({
    activeCalendarId: 'hotfix-calendar',
    calendars: [{ id: 'hotfix-calendar', name: 'Hotfix Calendar', createdAt: new Date().toISOString(), data }],
  }));
});
const openAI = async (page: Page) => {
  await page.goto('/');
  await page.getByTestId('nav-ai').click();
};

test.beforeEach(async ({ page }) => seed(page));

test('complete package reaches clipboard boundary', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (value: string) => { (window as any).__copied = value; return Promise.resolve(); } },
    });
  });
  await openAI(page);
  await page.getByTestId('button-ai-copy-package').click();
  const copied = await page.evaluate(() => (window as any).__copied as string);
  expect(copied.startsWith('Export Current LifeGrid to AI')).toBe(true);
  expect(copied).toContain(CONTEXT_MARKER);
  expect(copied).not.toContain('DataCloneError');
  expect(copied).not.toContain('unrelated Codex prompt text');
  expect(copied).not.toMatch(/addEvent\s*\([^)]*\)\s*\{|function\s+addEvent/);
  expect(parseLifeGridContext(copied).manifest.counts).toEqual(EXPECTED_COUNTS);
  await expect(page.getByTestId('ai-package-delivery-status')).toContainText('copied');
});

test('native Chromium clipboard contains the complete current package @chromium-native', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openAI(page);
  await page.evaluate(() => navigator.clipboard.writeText('unrelated Codex prompt text'));
  await page.getByTestId('button-ai-copy-package').click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith('Export Current LifeGrid to AI')).toBe(true);
  const parsed = parseLifeGridContext(copied);
  expect(parsed.manifest.scope).toBe('all');
  expect(parsed.manifest.counts).toEqual(EXPECTED_COUNTS);
});

test('fallback success reports delivery and retains preview', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
    Document.prototype.execCommand = () => true;
  });
  await openAI(page);
  await page.getByTestId('button-ai-copy-package').click();
  await expect(page.getByTestId('ai-package-delivery-status')).toContainText('copied');
  await expect(page.getByTestId('ai-package-preview')).toContainText(CONTEXT_MARKER.trim());
});

test('fallback failure retains manual preview without false success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } });
    Document.prototype.execCommand = () => false;
  });
  await openAI(page);
  await page.getByTestId('button-ai-copy-package').click();
  const status = page.getByTestId('ai-package-delivery-status');
  await expect(status).toContainText('Copy failed');
  await expect(status).not.toContainText('copied');
  await expect(page.getByTestId('ai-package-preview')).toContainText(CONTEXT_MARKER.trim());
});

test('download emits complete deterministic UTF-8 package', async ({ page }) => {
  await openAI(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('button-ai-download-package').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^lifegrid-ai-package-\d{4}-\d{2}-\d{2}\.txt$/);
  const stream = await download.createReadStream();
  let text = '';
  for await (const chunk of stream) text += chunk.toString();
  expect(text.length).toBeGreaterThan(0);
  expect(text).toContain('Export Current LifeGrid to AI');
  expect(text).not.toContain('DataCloneError');
  expect(text).not.toContain('unrelated Codex prompt text');
  const parsed = parseLifeGridContext(text);
  expect(parsed.metadata.selectedDateRange).toBeNull();
  expect(parsed.manifest.scope).toBe('all');
  expect(parsed.manifest.counts).toEqual(EXPECTED_COUNTS);
  expect(parsed.tasks.map((task: { id: string }) => task.id)).toEqual(['dated-task', 'undated-task', 'completed-task']);
  expect(parsed.tasks.some((task: { id: string }) => task.id === 'completed-task')).toBe(true);
  expect(parsed.tasks.some((task: { id: string }) => task.id === 'undated-task')).toBe(true);
  await expect(page.getByTestId('ai-package-delivery-status')).toContainText('started');
});

test('restricted range and return to all rebuild fresh packages', async ({ page }) => {
  await openAI(page);
  await page.getByTestId('ai-export-advanced').locator('summary').click();
  await page.getByTestId('ai-export-preset-custom').click();
  await page.getByLabel('Start date').fill('2026-08-01');
  await page.getByLabel('End date').fill('2026-08-01');
  await page.getByTestId('button-ai-download-package').click();
  await expect(page.getByTestId('ai-package-preview')).toContainText('"scope": "range"');
  await page.getByTestId('ai-export-preset-all').click();
  await page.getByTestId('button-ai-copy-package').click();
  await expect(page.getByTestId('ai-package-preview')).toContainText('"scope": "all"');
});
