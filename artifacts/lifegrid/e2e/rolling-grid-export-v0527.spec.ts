import { test, expect } from '@playwright/test';
test.describe.configure({ retries: 0 });
test('rolling month controls preserve exactly twelve semantic headers', async ({ page }) => {
  await page.goto('/#grid');
  const headers=page.locator('[data-month-key]'); await expect(headers).toHaveCount(12);
  const first=await headers.first().getAttribute('data-month-key');
  await page.getByTestId('button-month-next').click();
  await expect(headers).toHaveCount(12); await expect(headers.first()).not.toHaveAttribute('data-month-key',first!);
  await page.getByTestId('button-year-reset').click(); await expect(headers.first()).toHaveAttribute('data-month-key',/^\d{4}-01$/);
});
test('adaptive export presents publication choices without renderer choices', async ({ page }) => {
  await page.goto('/#grid'); await page.getByTestId('button-export').click();
  const panel=page.getByTestId(/panel-export/); await expect(panel).toContainText('Current Grid'); await expect(panel).toContainText('Calendar Year'); await expect(panel).toContainText('Q1'); await expect(panel).toContainText('Custom title');
  for(const label of ['Visible','Expanded','Fast','Sharp','Compact','Detailed']) await expect(panel.getByText(label,{exact:true})).toHaveCount(0);
});
