import { test, expect } from '@playwright/test';

test.describe('欄位儲存功能', () => {

  test('選項管理面板應有儲存選項按鈕', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.navbar');

    await page.evaluate(() => {
      allFields.length = 0;
      allFields.push({
        id: 'e2e-test-color',
        name: '顏色',
        options: ['紅色', '藍色', '綠色'],
        showInList: true,
        order: 0
      });
      allItems.length = 0;
      allUnits.length = 0;
    });

    await page.click('button:has-text("後台設定")');
    await page.waitForTimeout(300);
    await page.click('text=顏色');
    await page.waitForTimeout(300);

    await expect(page.locator('text=選項管理')).toBeVisible();
    const saveBtn = page.locator('.options-panel button:has-text("儲存選項")');
    await expect(saveBtn).toBeVisible();
    const onclick = await saveBtn.getAttribute('onclick');
    expect(onclick).toContain('saveFieldOptions');
  });

});
