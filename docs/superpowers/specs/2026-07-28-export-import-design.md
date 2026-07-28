# 庫存管理系統 — 匯出匯入功能規格

## 概述
為庫存管理系統增加完整資料備份（匯出）與還原（匯入）功能，防止資料遺失。後續改為桌面版時，此功能亦可作為檔案格式基礎。

## 使用流程

### 匯出備份
1. 使用者在後台設定頁面點擊「匯出備份」按鈕
2. 系統讀取全部 `inv_items` + `inv_fields` + `inv_units`
3. 打包為 JSON 檔案，瀏覽器自動下載
4. 檔名格式：`庫存備份-YYYY-MM-DD.json`

### 匯入還原
1. 使用者點擊「匯入還原」按鈕 → 開啟檔案選擇器（限 `.json`）
2. 解析檔案，驗證格式是否正確
3. 跳出 `confirm()` 確認：「⚠️ 此操作將清除所有現有資料，是否確定還原？」
4. 確認後：清空三個集合 → 批次寫入備份資料 → 重新載入頁面
5. 顯示成功/失敗訊息

## UI 配置
在後台設定模式（`renderFieldList`）的欄位列表下方，新增「資料管理」區塊：
- 兩個按鈕：`[⬇ 匯出備份]` 和 `[⬆ 匯入還原]`
- 匯入使用隱藏的 `<input type="file" accept=".json">`

## 資料格式

```json
{
  "version": 1,
  "exportedAt": "2026-07-28T12:00:00.000Z",
  "data": {
    "items": [
      { "id": "蘋果", "name": "蘋果", "createdAt": { ".sv": "timestamp" } }
    ],
    "fields": [
      { "id": "顏色", "name": "顏色", "options": ["紅色","藍色"], "order": 0, "showInList": true }
    ],
    "units": [
      { "id": "abc123", "itemName": "蘋果", "fields": {"顏色":["紅色"]}, "quantity": 5, "location": "A1", "note": "", "createdAt": { ".sv": "timestamp" } }
    ]
  }
}
```

- `version`：格式版本號（目前為 1），未來擴充用
- `exportedAt`：匯出時間 ISO 字串
- `data`：三集合資料，id 為 Firestore 文件 ID
- `createdAt` 在匯出時記錄為 ISO 字串，匯入時以 serverTimestamp 重新產生

## 實作細節

### 新增檔案
- `public/js/backup.js` — 匯出匯入邏輯，在 `app.js` 後載入

### 函數
- `exportBackup()`：讀取三集合 → 組 JSON → 觸發下載
- `importBackup(file)`：讀檔案 → 解析 → 確認 → 清空 → 批次寫入

### 安全考量
- 匯入前強制 `confirm()` 確認，避免誤操作
- 使用 Firestore Batch Write 確保全部寫入或全部失敗（3 集合分 3 批 batch）
- 檔案格式驗證：檢查 `version` 與 `data` 三個陣列存在

### 測試策略
- Playwright E2E 測試：匯出後匯入，驗證資料正確還原
- 由於測試環境 Firestore 可能受限，測試先 mock 資料後驗證 UI 按鈕存在與 onclick
