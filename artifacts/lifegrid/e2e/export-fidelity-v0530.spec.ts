import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

test.describe.configure({ retries: 0 });
test.setTimeout(90_000);
test.use({ timezoneId: 'America/New_York' });

const labels = [
  'USAF',
  'Fun',
  'Family',
  'Health',
  'Holidays',
  'Langley ED Shifts',
  'USACS and Moonlighting',
  'Relationship / Wife',
  'Certification, Credentials and Continuing Education',
  'Requested Day Off',
];
const colors = ['#2563eb', '#16a34a', '#dc2626', '#9333ea'];
const categories = labels.map((label, index) => ({ id: `c${index}`, label, color: colors[index % colors.length] }));
const event = (id: string, date: string, categoryIndex: number, title = `Event ${id}`) => ({
  id, date, endDate: date, title, category: `c${categoryIndex % categories.length}`,
  projectId: null, timeStatus: 'all-day', startTime: null, endTime: null,
  color: colors[categoryIndex % colors.length], notes: null, displayPriority: 4,
  showInGrid: true, showInExport: true, linkedTaskIds: [], aiNotes: null, sourceNotes: null,
});
const rollingEvents = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 7, 31 + index)).toISOString().slice(0, 10);
  return event(`rolling-${index}`, date, index, index === 0 ? 'Drop off Natalie before Chicago trip' : `Event ${index + 1}`);
});
// A deliberately heterogeneous second rolling week proves that equality comes from
// the shared publication plan, rather than coincidentally equal per-week density.
const heterogeneousEvents = [
  event('dense-week-2-a', '2026-09-07', 1),
  event('dense-week-2-b', '2026-09-07', 2),
];
// Current Month is August at the fixed clock. Every asserted legend Category must
// therefore be represented by an actual in-range publication Event.
const augustLegendEvents = labels.map((_, index) => event(`august-category-${index}`, `2026-08-${String(index + 1).padStart(2, '0')}`, index));
const seed = {
  events: [...rollingEvents, ...heterogeneousEvents, ...augustLegendEvents],
  tasks: [], personEvents: [], people: [], milestones: [], categories, projects: [],
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-08-31T12:00:00'));
  await page.addInitScript(data => {
    (window as Window & { __fillTexts?: string[] }).__fillTexts = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      (window as Window & { __fillTexts?: string[] }).__fillTexts?.push(String(text));
      return original.call(this, text, ...args as [number, number, number?]);
    };
    const key = 'lifegrid_store_v5';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify({
        activeCalendarId: 'v0530',
        calendars: [{ id: 'v0530', name: 'Fidelity Calendar', createdAt: '2026-08-31T12:00:00.000Z', data }],
      }));
    }
  }, seed);
  await page.goto('/#grid');
  await expect(page.getByTestId('grid-content')).toHaveAttribute('aria-busy', 'false');
});

const open = async (page: Page, preset: string) => {
  await page.getByTestId('button-export').click();
  await page.getByTestId(`export-date-preset-${preset}`).click();
};
const generate = async (page: Page) => {
  await page.getByTestId('button-export-generate').click();
  await expect(page.getByTestId('grid-export-status')).toHaveAttribute('data-export-status', 'ready', { timeout: 45_000 });
  const image = page.getByTestId('export-preview-image');
  await expect(image).toBeVisible();
  return image.evaluate(async (node: HTMLImageElement) => {
    if (!node.complete || !node.naturalWidth) await node.decode();
    return { src: node.src, w: node.naturalWidth, h: node.naturalHeight };
  });
};
const useSparseNext30Fixture = async (page: Page) => {
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('lifegrid_store_v5')!);
    store.calendars[0].data.events = store.calendars[0].data.events.filter((item: { id: string }) => item.id.startsWith('rolling-'));
    localStorage.setItem('lifegrid_store_v5', JSON.stringify(store));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('lifegrid_store_v5')!);
    const ids = store.calendars[0].data.events.map((item: { id: string }) => item.id);
    return {
      count: ids.length,
      allRolling: ids.every((id: string) => id.startsWith('rolling-')),
      hasDenseA: ids.includes('dense-week-2-a'),
      hasDenseB: ids.includes('dense-week-2-b'),
    };
  })).toEqual({ count: 30, allRolling: true, hasDenseA: false, hasDenseB: false });
  await expect(page.getByTestId('grid-content')).toHaveAttribute('aria-busy', 'false');
};
const contrast = (a: string, b: string) => {
  const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const luminance = (value: string) => {
    const channels = rgb(value).map(channel => {
      channel /= 255;
      return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    });
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  };
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + .05) / (low + .05);
};
const expectExactStructuralRange = async (root: Locator, expectedCount: number, first: [string, string], last: [string, string]) => {
  const months = root.locator('[data-publication-month]');
  const days = root.locator('[data-publication-day]');
  await expect(days).toHaveCount(expectedCount);
  await expect(months).toHaveCount(expectedCount);
  await expect(months.first()).toHaveText(first[0]);
  await expect(days.first()).toHaveText(first[1]);
  await expect(months.last()).toHaveText(last[0]);
  await expect(days.last()).toHaveText(last[1]);
  expect(await root.locator('[data-publication-month],[data-publication-day]').allTextContents()).not.toEqual(expect.arrayContaining([expect.stringMatching(/…|\.\.\./)]));
};
const expectNoFirefoxStructuralEllipsis = async (page: Page, testInfo: TestInfo, exactTokens: string[]) => {
  if (testInfo.project.name !== 'firefox') return;
  const texts = await page.evaluate(() => (window as Window & { __fillTexts?: string[] }).__fillTexts ?? []);
  for (const token of exactTokens) expect(texts).toContain(token);
  expect(texts.filter(text => exactTokens.some(token => text.startsWith(token))).some(text => text.includes('…') || text.includes('...'))).toBe(false);
};

test('Light Current Grid from Dark app has computed child contrast and mapped dark pixels in a real PNG', async ({ page }) => {
  await page.getByTestId('button-theme-toggle').click();
  await open(page, 'currentGrid');
  await generate(page);
  const root = page.getByTestId('export-month-publication');
  await expect(root).toHaveAttribute('data-publication-layout', 'month-columns');
  const values = await root.evaluate(node => {
    const background = getComputedStyle(node).backgroundColor;
    const color = (selector: string) => getComputedStyle(node.querySelector(selector)!).color;
    return { background, title: color('[data-publication-title]'), category: color('[data-publication-categories-label]'), legend: color('[data-publication-legend-label]') };
  });
  for (const color of [values.title, values.category, values.legend]) expect(contrast(color, values.background)).toBeGreaterThanOrEqual(4.5);

  const mappedRegion = await root.evaluate(node => {
    const rootRect = node.getBoundingClientRect();
    const headerRect = node.querySelector('[data-testid=export-publication-header]')!.getBoundingClientRect();
    return {
      x: headerRect.left - rootRect.left,
      y: headerRect.top - rootRect.top,
      width: headerRect.width,
      height: headerRect.height,
      sourceWidth: (node as HTMLElement).scrollWidth,
      sourceHeight: (node as HTMLElement).scrollHeight,
    };
  });
  const darkPixels = await page.getByTestId('export-preview-image').evaluate(async (node: HTMLImageElement, region) => {
    if (!node.complete || !node.naturalWidth) await node.decode();
    const scaleX = node.naturalWidth / region.sourceWidth;
    const scaleY = node.naturalHeight / region.sourceHeight;
    const left = Math.max(0, Math.min(node.naturalWidth - 1, Math.floor(region.x * scaleX)));
    const top = Math.max(0, Math.min(node.naturalHeight - 1, Math.floor(region.y * scaleY)));
    const width = Math.max(1, Math.min(node.naturalWidth - left, Math.ceil(region.width * scaleX)));
    const height = Math.max(1, Math.min(node.naturalHeight - top, Math.ceil(region.height * scaleY)));
    const canvas = document.createElement('canvas');
    canvas.width = node.naturalWidth; canvas.height = node.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(node, 0, 0);
    const pixels = context.getImageData(left, top, width, height).data;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] < 100 && pixels[index + 1] < 100 && pixels[index + 2] < 100 && pixels[index + 3] > 0) count += 1;
    }
    return count;
  }, mappedRegion);
  expect(darkPixels).toBeGreaterThan(100);
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('Dark Current Grid from Light app has readable semantic children and a real PNG', async ({ page }) => {
  await open(page, 'currentGrid');
  await page.getByTestId('export-theme-control').getByRole('button', { name: 'Dark' }).click();
  await generate(page);
  const root = page.getByTestId('export-month-publication');
  const values = await root.evaluate(node => ({
    background: getComputedStyle(node).backgroundColor,
    colors: ['[data-publication-title]', '[data-publication-categories-label]', '[data-publication-legend-label]'].map(selector => getComputedStyle(node.querySelector(selector)!).color),
  }));
  for (const color of values.colors) expect(contrast(color, values.background)).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
});

test('Next 7 draws exact structural dates at cell tops in a Letter PNG', async ({ page }, testInfo) => {
  await open(page, 'next7');
  const root = page.getByTestId('targeted-export-grid');
  const cells = root.locator('[data-testid^=targeted-export-day-]');
  await expect(cells).toHaveCount(7);
  await expect(root.locator('thead th')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expectExactStructuralRange(root, 7, ['Aug', '31'], ['Sep', '6']);
  const topOffsets = await cells.evaluateAll(nodes => nodes.map(node => {
    const cell = node.getBoundingClientRect();
    const date = node.querySelector('[data-publication-date]')!.getBoundingClientRect();
    return date.top - cell.top;
  }));
  expect(Math.max(...topOffsets)).toBeLessThanOrEqual(16);
  const png = await generate(page);
  expect(Math.abs(png.w / png.h - 11 / 8.5) / (11 / 8.5)).toBeLessThan(.015);
  await expectNoFirefoxStructuralEllipsis(page, testInfo, ['Aug', '31', 'Sep', '1', '2', '3', '4', '5', '6']);
});

const expectEqualTopAlignedRows = async (root: Locator, rowCount: number) => {
  const rows = root.locator('tbody tr');
  await expect(rows).toHaveCount(rowCount);
  const heights = await rows.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  const dateOffsets = await root.locator('[data-testid^=targeted-export-day-]').evaluateAll(nodes => nodes.map(node => {
    const cell = node.getBoundingClientRect();
    return node.querySelector('[data-publication-date]')!.getBoundingClientRect().top - cell.top;
  }));
  expect(Math.max(...dateOffsets)).toBeLessThanOrEqual(16);
  return heights;
};

test('Next 14 heterogeneous density fits Letter with shared rows and exact dates', async ({ page }, testInfo) => {
  await open(page, 'next14');
  const root = page.getByTestId('targeted-export-grid');
  const heights = await expectEqualTopAlignedRows(root, 2);
  expect(heights[0]).toBeGreaterThan(112);
  await expectExactStructuralRange(root, 14, ['Aug', '31'], ['Sep', '13']);
  await expect(root).toHaveAttribute('data-publication-overflowed-frame', 'false');
  await expect(root.locator('[data-source-event-id]')).toHaveCount(16);
  const png = await generate(page);
  expect(Math.abs(png.w / png.h - 11 / 8.5) / (11 / 8.5)).toBeLessThan(.015);
  await expectNoFirefoxStructuralEllipsis(page, testInfo, ['Aug', '31', 'Sep', ...Array.from({ length: 13 }, (_, index) => String(index + 1))]);
});

test('sparse Next 30 fits Letter with five shared rows and exact dates', async ({ page }, testInfo) => {
  await useSparseNext30Fixture(page);
  await open(page, 'next30');
  const root = page.getByTestId('targeted-export-grid');
  await expect(root).toHaveAttribute('data-publication-event-count', '30');
  await expectEqualTopAlignedRows(root, 5);
  await expectExactStructuralRange(root, 30, ['Aug', '31'], ['Sep', '29']);
  await expect(root).toHaveAttribute('data-publication-overflowed-frame', 'false');
  await expect(root.locator('[data-source-event-id]')).toHaveCount(30);
  const png = await generate(page);
  expect(Math.abs(png.w / png.h - 11 / 8.5) / (11 / 8.5)).toBeLessThan(.015);
  await expectNoFirefoxStructuralEllipsis(page, testInfo, ['Aug', '31', 'Sep', ...Array.from({ length: 29 }, (_, index) => String(index + 1))]);
});

test('heterogeneous Next 30 grows beyond Letter and captures every Event', async ({ page }, testInfo) => {
  await open(page, 'next30');
  const root = page.getByTestId('targeted-export-grid');
  const heights = await expectEqualTopAlignedRows(root, 5);
  expect(heights[0]).toBeGreaterThan(112);
  await expectExactStructuralRange(root, 30, ['Aug', '31'], ['Sep', '29']);
  await expect(root.locator('[data-source-event-id]')).toHaveCount(32);
  const overlap = await root.locator('[data-testid^=targeted-export-day-]').evaluateAll(cells => cells.some(cell => {
    const dateBottom = cell.querySelector('[data-publication-date]')!.getBoundingClientRect().bottom;
    const cards = [...cell.querySelectorAll<HTMLElement>('[data-source-event-id]')];
    if (cards[0] && cards[0].getBoundingClientRect().top < dateBottom) return true;
    return cards.slice(1).some((card, index) => card.getBoundingClientRect().top < cards[index].getBoundingClientRect().bottom);
  }));
  expect(overlap).toBe(false);
  await expect(root).toHaveAttribute('data-publication-frame-width', '1400');
  await expect(root).toHaveAttribute('data-publication-overflowed-frame', 'true');
  const bounds = await root.evaluate(node => ({
    contentHeight: Number((node as HTMLElement).dataset.publicationContentHeight),
    frameHeight: Number((node as HTMLElement).dataset.publicationFrameHeight),
    pixelRatio: Number((node as HTMLElement).dataset.publicationPixelRatio),
    scrollHeight: (node as HTMLElement).scrollHeight,
    finalEventBottom: node.querySelector('[data-testid="targeted-export-event-2026-09-29-rolling-29"]')!.getBoundingClientRect().bottom - node.getBoundingClientRect().top,
    finalRowBottom: node.querySelector('tbody tr:last-child')!.getBoundingClientRect().bottom - node.getBoundingClientRect().top,
  }));
  expect(bounds.frameHeight).toBe(1082);
  expect(bounds.contentHeight).toBeGreaterThan(1082);
  expect(bounds.scrollHeight).toBeGreaterThan(1082);
  const png = await generate(page);
  const renderer = await page.getByTestId('grid-export-status').getAttribute('data-export-renderer');
  const expectedScale = renderer === 'canvas2d' ? Math.min(bounds.pixelRatio, 1.5) : bounds.pixelRatio;
  expect(Math.abs(png.w - 1400 * expectedScale)).toBeLessThanOrEqual(2);
  expect(Math.abs(png.h - bounds.scrollHeight * expectedScale)).toBeLessThanOrEqual(3);
  expect(bounds.finalRowBottom * expectedScale).toBeLessThanOrEqual(png.h + 1);
  expect(bounds.finalEventBottom * expectedScale).toBeLessThanOrEqual(png.h + 1);
  await expectNoFirefoxStructuralEllipsis(page, testInfo, ['Aug', '31', 'Sep', ...Array.from({ length: 29 }, (_, index) => String(index + 1))]);
});

test('CY Current Month has represented legends, exact dates, and a real PNG', async ({ page }, testInfo) => {
  await open(page, 'currentMonth');
  const root = page.getByTestId('targeted-export-grid');
  await expect(root.locator('thead th')).toHaveText(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  await expectExactStructuralRange(root, 31, ['Aug', '1'], ['Aug', '31']);
  for (const label of labels) {
    const item = root.locator('[data-publication-legend-label]', { hasText: label });
    await expect(item).toHaveText(label);
    const style = await item.evaluate(node => ({ wordBreak: getComputedStyle(node).wordBreak, overflowWrap: getComputedStyle(node).overflowWrap }));
    expect(style.wordBreak).toBe('normal');
    expect(style.overflowWrap).toBe('break-word');
  }
  const png = await generate(page);
  expect(Math.abs(png.w / png.h - 11 / 8.5) / (11 / 8.5)).toBeLessThan(.02);
  await expectNoFirefoxStructuralEllipsis(page, testInfo, ['Aug', '1', '31']);
});
