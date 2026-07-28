import { test, expect } from '@playwright/test';

test.describe('欄位儲存功能', () => {

  test('選項管理面板應有儲存按鈕', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 等待頁面基本元素出現
    await page.waitForSelector('.navbar');
    await page.waitForSelector('.container');

    // 注入測試資料到 app 變數，繞過 Firestore
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

    // 切換至後台設定
    await page.click('button:has-text("後台設定")');
    await page.waitForTimeout(300);

    // 點擊測試欄位進入選項管理
    await page.click('text=顏色');
    await page.waitForTimeout(300);

    // 確認已進入選項管理面板
    await expect(page.locator('text=選項管理')).toBeVisible();

    // === bug 修復驗證：選項管理面板應該要有儲存按鈕 ===
    const saveBtn = page.locator('.options-panel button:has-text("儲存選項")');
    await expect(saveBtn).toBeVisible();

    // 確認按鈕 onclick 正確指向 saveFieldOptions
    const onclick = await saveBtn.getAttribute('onclick');
    expect(onclick).toContain('saveFieldOptions');
  });

});
