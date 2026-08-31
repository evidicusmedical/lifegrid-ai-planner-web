import { test, expect } from '@playwright/test';
test.describe.configure({ retries: 0 });
test('operational export defaults reset and presets retain required DOM order', async ({ page }) => {
  await page.goto('/');
  const open = page.getByTestId('button-export'); await open.click();
  const ids=['currentGrid','calendarYear','q1','q2','q3','q4','currentMonth','next30','next14','next7','today','custom'];
  await expect(page.locator('[data-testid^="export-date-preset-"]')).toHaveCount(12);
  await expect(page.locator('[data-testid^="export-date-preset-"]')).toHaveText(['Current Grid','Calendar Year','CY Q1','CY Q2','CY Q3','CY Q4','CY Current Month','Next 30','Next 14','Next 7','Today','Custom']);
  await expect(page.getByTestId(`export-date-preset-${ids[0]}`)).toHaveAttribute('aria-pressed','true');
  await expect(page.getByTestId('export-theme-control').getByRole('button',{name:'Light'})).toHaveAttribute('aria-pressed','true');
  await page.getByTestId('export-theme-control').getByRole('button',{name:'Dark'}).click();
  await page.getByRole('button',{name:'Close'}).last().click(); await open.click();
  await expect(page.getByTestId('export-theme-control').getByRole('button',{name:'Light'})).toHaveAttribute('aria-pressed','true');
});
