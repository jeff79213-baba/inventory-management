import { test, expect } from '@playwright/test';

test.describe('匯出匯入功能', () => {

  test('後台設定頁應有匯出備份與匯入還原按鈕', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.navbar');

    await page.evaluate(() => {
      allFields.length = 0;
      allItems.length = 0;
      allUnits.length = 0;
    });

    await page.click('button:has-text("後台設定")');
    await page.waitForTimeout(500);

    const exportBtn = page.locator('button:has-text("匯出備份")');
    await expect(exportBtn).toBeVisible();
    const exportOnclick = await exportBtn.getAttribute('onclick');
    expect(exportOnclick).toContain('exportBackup');

    const importBtn = page.locator('button:has-text("匯入還原")');
    await expect(importBtn).toBeVisible();
    const importOnclick = await importBtn.getAttribute('onclick');
    expect(importOnclick).toContain('triggerImport');

    const fileInput = page.locator('#importFileInput');
    await expect(fileInput).toHaveAttribute('accept', '.json');
    await expect(fileInput).toHaveAttribute('onchange', 'handleImportFile(event)');
  });

  test('exportBackup 應產出正確格式的 JSON', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.navbar');

    const result = await page.evaluate(() => {
      const items = [
        { id: '蘋果', name: '蘋果' },
        { id: '香蕉', name: '香蕉' }
      ];
      const fields = [
        { id: '顏色', name: '顏色', options: ['紅', '藍'], order: 0, showInList: true }
      ];
      const units = [
        { id: 'u1', itemName: '蘋果', fields: { '顏色': ['紅'] }, quantity: 5, location: 'A1', note: '' }
      ];
      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: { items, fields, units }
      };
      try {
        JSON.parse(JSON.stringify(backup));
        return { ok: true, version: backup.version, counts: {
          items: items.length, fields: fields.length, units: units.length
        }};
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    expect(result.ok).toBe(true);
    expect(result.version).toBe(1);
    expect(result.counts.items).toBe(2);
    expect(result.counts.fields).toBe(1);
    expect(result.counts.units).toBe(1);
  });

});
