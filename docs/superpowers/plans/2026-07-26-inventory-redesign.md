# 庫存管理系統重新設計 — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將庫存管理從傳統表格改為三層膠囊式單頁雙模式，為未來桌面 APP 鋪路。

**Architecture:** 單頁 `index.html` 內建雙模式（庫存列表/後台設定）。共用三層結構（搜尋列→名稱膠囊→編輯區）。Firestore 欄位獨立為 `inv_fields` 集合，品項使用 `inv_items`。

**Tech Stack:** Firebase v9 compat (Firestore), Vanilla JS, CSS3 (flex-wrap)

## Global Constraints

- Firestore 集合前綴：`inv_`
- 所有新欄位統一使用「可複選膠囊」模式，無下拉選單、無文字輸入欄位類型
- 單頁 index.html，無 settings.html
- 觸控友善，響應式 RWD
- 預留 photoPath 欄位供未來桌面 APP 使用

---

### Task 1: Firestore 資料結構遷移 + config.js

**Files:**
- Modify: `public/js/config.js`
- Create: `public/js/db.js`

**Interfaces:**
- Consumes: Firebase `opencode-sk` 專案
- Produces: `db.js` — 匯出 `db` 實例、集合參考常數

**遷移邏輯：**
- 讀取 `inv_settings/global` 中既有的 `fields` 陣列
- 逐一寫入 `inv_fields/{fieldName}` 文件（name + options）
- 寫入 `inv_items` 已存在資料不受影響（attributes 仍為各欄位名稱 key）

- [ ] **Step 1: 建立 db.js**

```js
// public/js/db.js
const DB = {
  instance: firebase.firestore(),
  FIELDS: 'inv_fields',
  ITEMS: 'inv_items'
};
```

- [ ] **Step 2: 修改 config.js 載入 db.js**

```html
<script src="js/config.js"></script>
<script src="js/db.js"></script>
```

- [ ] **Step 3: 撰寫遷移腳本 migrate.js（一次性）**

```js
// 從 inv_settings/global 讀取 fields → 寫入 inv_fields/{name}
async function migrateFields() {
  const doc = await db.doc('inv_settings/global').get();
  if (!doc.exists) return;
  const fields = doc.data().fields || [];
  const batch = db.batch();
  fields.forEach(f => {
    const ref = db.collection(DB.FIELDS).doc(f.name);
    batch.set(ref, { name: f.name, options: f.options || [] });
  });
  await batch.commit();
  console.log(`Migrated ${fields.length} fields`);
}
```

- [ ] **Step 4: 第一次執行遷移（手動在瀏覽器 console 執行一次）**

- [ ] **Step 5: Commit**

```bash
git add public/js/config.js public/js/db.js
git commit -m "feat: add db.js, prepare inv_fields migration"
```

---

### Task 2: 單頁 HTML 結構（三層佈局 + 雙模式）

**Files:**
- Rewrite: `public/index.html`
- Rewrite: `public/css/styles.css`

**HTML 結構：**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>庫存管理系統</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- 頂部導航 -->
  <nav class="navbar">
    <a href="#" class="navbar-brand">庫存管理系統</a>
    <div class="mode-toggle">
      <button class="mode-btn active" data-mode="inventory" onclick="switchMode('inventory')">庫存列表</button>
      <button class="mode-btn" data-mode="settings" onclick="switchMode('settings')">後台設定</button>
    </div>
  </nav>

  <div class="container">
    <!-- 第一層：搜尋列 -->
    <div class="search-bar">
      <input type="text" id="searchInput" class="form-input" placeholder="搜尋..."
             oninput="onSearch(this.value)">
    </div>

    <!-- 第二層：名稱膠囊區 -->
    <div id="capsuleArea" class="capsule-area">
      <!-- 動態產生 -->
    </div>

    <!-- 第三層：編輯區 -->
    <div id="editArea" class="edit-area">
      <div class="empty-state">請選擇上方品項</div>
    </div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script src="js/config.js"></script>
  <script src="js/db.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

**CSS 核心樣式（styles.css）：**

```css
/* 重置 + 變數保留原本 */
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --danger: #dc2626;
  --success: #16a34a;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-500: #6b7280;
  --gray-700: #374151;
  --gray-900: #111827;
  --radius: 8px;
  --capsule-bg: #e5e7eb;
  --capsule-active: #2563eb;
  --capsule-active-text: #fff;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--gray-100);
  color: var(--gray-900);
  line-height: 1.5;
}
.container { max-width: 1200px; margin: 0 auto; padding: 20px; }

/* 導航 + 模式切換 */
.navbar {
  background: white;
  border-bottom: 1px solid var(--gray-200);
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.navbar-brand { font-size: 1.25rem; font-weight: 600; color: var(--gray-900); text-decoration: none; }
.mode-toggle { display: flex; gap: 4px; }
.mode-btn {
  padding: 6px 16px;
  border: 1px solid var(--gray-300);
  background: white;
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--gray-700);
}
.mode-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* 搜尋列 */
.search-bar { margin-bottom: 16px; }
.search-bar .form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 1rem;
}

/* 膠囊區 */
.capsule-area {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
  background: white;
  border-radius: var(--radius);
  margin-bottom: 16px;
  min-height: 60px;
}
.capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--capsule-bg);
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
  border: 2px solid transparent;
}
.capsule:hover { background: #d1d5db; }
.capsule.active {
  background: var(--capsule-active);
  color: var(--capsule-active-text);
  border-color: var(--capsule-active);
}
.capsule-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  border: none;
}

/* 編輯區 */
.edit-area {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  min-height: 200px;
}
.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--gray-200);
}
.edit-title { font-size: 1.1rem; font-weight: 600; }

/* 欄位區塊 — flex-wrap 橫排 */
.field-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}
.field-block {
  flex: 1 1 200px;
  min-width: 180px;
  background: var(--gray-100);
  border-radius: var(--radius);
  padding: 12px;
}
.field-block-title {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--gray-700);
}
.field-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.option-capsule {
  padding: 4px 12px;
  background: white;
  border: 1px solid var(--gray-300);
  border-radius: 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s;
}
.option-capsule.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* 底部資訊列 */
.edit-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  padding-top: 16px;
  border-top: 1px solid var(--gray-200);
}
.edit-footer .form-group { flex: 1 1 180px; }
.edit-footer .form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--gray-300);
  border-radius: var(--radius);
  font-size: 0.9rem;
}
.photo-block { text-align: center; }
.photo-block img { max-width: 120px; max-height: 120px; border-radius: 4px; }
.photo-path { font-size: 0.75rem; color: var(--gray-500); word-break: break-all; margin-top: 4px; }

/* 空狀態 */
.empty-state { text-align: center; padding: 40px; color: var(--gray-500); }

/* settings 專用：膠囊工具列 */
.capsule-tools { display: inline-flex; gap: 4px; margin-left: 4px; }
.capsule-tools button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
  color: var(--gray-500);
  line-height: 1;
}
.capsule-tools button:hover { color: var(--gray-900); }
.drag-handle { cursor: grab; color: var(--gray-500); }

@media (max-width: 768px) {
  .container { padding: 12px; }
  .navbar { flex-direction: column; gap: 8px; }
  .field-block { flex: 1 1 100%; min-width: 0; }
}
```

- [ ] **Step 1: 寫入新 index.html**

- [ ] **Step 2: 寫入新 styles.css**

- [ ] **Step 3: 刪除 settings.html**

- [ ] **Step 4: Commit**

```bash
git rm public/settings.html
git add public/index.html public/css/styles.css
git commit -m "feat: single-page layout with dual-mode and three-layer structure"
```

---

### Task 3: 核心 JS — 模式切換 + 資料載入

**Files:**
- Create: `public/js/app.js`

**Interfaces:**
- Consumes: `DB` from `db.js`
- Produces: `switchMode(mode)`, `loadCapsules(mode)`, `onSearch(query)`, `currentMode`, `currentSelection`

```js
// public/js/app.js
let currentMode = 'inventory';
let currentSelection = null; // 選中的品項ID 或 欄位ID
let allItems = [];
let allFields = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  renderCapsules();
});

async function loadAllData() {
  const [itemsSnap, fieldsSnap] = await Promise.all([
    DB.instance.collection(DB.ITEMS).orderBy('name').get(),
    DB.instance.collection(DB.FIELDS).orderBy('name').get()
  ]);
  allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  allFields = fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function switchMode(mode) {
  currentMode = mode;
  currentSelection = null;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('searchInput').value = '';
  document.getElementById('searchInput').placeholder = mode === 'inventory' ? '搜尋品項名稱、欄位值、位置、備註...' : '搜尋欄位名稱...';
  renderCapsules();
  renderEditArea();
}

function onSearch(query) {
  renderCapsules(query);
}

function renderCapsules(query) {
  const area = document.getElementById('capsuleArea');
  const list = currentMode === 'inventory' ? allItems : allFields;
  const filtered = query
    ? list.filter(item => {
        const haystack = JSON.stringify(item).toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
    : list;
  area.innerHTML = filtered.map(item => `
    <div class="capsule ${currentSelection === item.id ? 'active' : ''}"
         onclick="selectCapsule('${item.id}')">
      ${escapeHtml(currentMode === 'inventory' ? item.name : item.name)}
    </div>
  `).join('') + `<button class="capsule-add" onclick="openAddNew()">+</button>`;
}

function selectCapsule(id) {
  currentSelection = currentSelection === id ? null : id;
  renderCapsules(document.getElementById('searchInput').value);
  renderEditArea();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

- [ ] **Step 1: 建立 app.js 含模式切換、資料載入、膠囊渲染**

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: core app with mode switching and capsule rendering"
```

---

### Task 4: 庫存模式 — 編輯區（顯示品項詳細資料）

**Files:**
- Modify: `public/js/app.js`

**實作 `renderEditArea()` 在庫存模式：**

```js
function renderEditArea() {
  const area = document.getElementById('editArea');
  if (!currentSelection || currentMode === 'settings') {
    area.innerHTML = '<div class="empty-state">請選擇上方品項</div>';
    return;
  }
  const item = allItems.find(i => i.id === currentSelection);
  if (!item) return;

  const selectedFields = item.selectedFields || [];
  const attributes = item.attributes || {};

  // 欄位區塊
  const fieldBlocks = selectedFields.map(fieldName => {
    const field = allFields.find(f => f.id === fieldName);
    if (!field) return '';
    const selectedVals = attributes[fieldName] || [];
    return `
      <div class="field-block">
        <div class="field-block-title">${escapeHtml(field.name)}</div>
        <div class="field-options" data-field="${escapeHtml(fieldName)}">
          ${(field.options || []).map(opt => `
            <div class="option-capsule ${selectedVals.includes(opt) ? 'active' : ''}"
                 onclick="toggleOption('${escapeHtml(fieldName)}','${escapeHtml(opt)}')">
              ${escapeHtml(opt)}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  area.innerHTML = `
    <div class="edit-header">
      <span class="edit-title">${escapeHtml(item.name)}</span>
      <button class="btn btn-primary" onclick="saveItem()">儲存</button>
    </div>
    <div class="field-grid">${fieldBlocks}</div>
    <div class="edit-footer">
      <div class="form-group">
        <label class="form-label">擺放位置</label>
        <input type="text" class="form-input" id="editLocation" value="${escapeHtml(item.location || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">數量</label>
        <input type="number" class="form-input" id="editQty" value="${item.quantity || 0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <input type="text" class="form-input" id="editNote" value="${escapeHtml(item.note || '')}">
      </div>
      <div class="photo-block">
        ${item.photo ? `<img src="${item.photo}" onclick="copyPath('${escapeHtml(item.photoPath || '')}')">` : '<div class="empty-state" style="padding:10px">無照片</div>'}
        <div class="photo-path">${escapeHtml(item.photoPath || '')}</div>
      </div>
    </div>
  `;
}

function toggleOption(fieldName, value) {
  const item = allItems.find(i => i.id === currentSelection);
  if (!item) return;
  if (!item.attributes) item.attributes = {};
  if (!item.attributes[fieldName]) item.attributes[fieldName] = [];
  const arr = item.attributes[fieldName];
  const idx = arr.indexOf(value);
  if (idx > -1) arr.splice(idx, 1);
  else arr.push(value);
  renderEditArea();
}
```

- [ ] **Step 1: 實作庫存模式編輯區渲染 + 選項切換**

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: inventory edit area with field blocks and option toggle"
```

---

### Task 5: 儲存品項 + 新增品項

**Files:**
- Modify: `public/js/app.js`

```js
async function saveItem() {
  const item = allItems.find(i => i.id === currentSelection);
  if (!item) return;
  const location = document.getElementById('editLocation')?.value?.trim() || '';
  const quantity = parseInt(document.getElementById('editQty')?.value) || 0;
  const note = document.getElementById('editNote')?.value?.trim() || '';
  try {
    await DB.instance.collection(DB.ITEMS).doc(item.id).update({
      location,
      quantity,
      note,
      attributes: item.attributes || {},
      selectedFields: item.selectedFields || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    showStatus('✗ 儲存失敗', 'error');
  }
}

function showStatus(msg, cls) {
  const existing = document.querySelector('.save-status');
  if (existing) existing.remove();
  const el = document.createElement('span');
  el.className = `save-status ${cls}`;
  el.textContent = msg;
  document.querySelector('.edit-header').appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function openAddNew() {
  if (currentMode === 'inventory') {
    openAddItem();
  } else {
    openAddField();
  }
}

function openAddItem() {
  // 顯示新品項編輯區，所有欄位列出，名稱先輸入
  const area = document.getElementById('editArea');
  const fieldBlocks = allFields.map(f => `
    <div class="field-block">
      <div class="field-block-title">${escapeHtml(f.name)}</div>
      <div class="field-options" data-field="${escapeHtml(f.id)}">
        ${(f.options || []).map(opt => `
          <div class="option-capsule" onclick="toggleNewOption('${escapeHtml(f.id)}','${escapeHtml(opt)}')">
            ${escapeHtml(opt)}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  area.innerHTML = `
    <div class="edit-header">
      <input type="text" id="newItemName" class="form-input" style="max-width:300px;font-size:1.1rem;font-weight:600" placeholder="輸入品項名稱">
      <button class="btn btn-primary" onclick="saveNewItem()">儲存</button>
    </div>
    <div class="field-grid">${fieldBlocks}</div>
    <div class="edit-footer">
      <div class="form-group">
        <label class="form-label">擺放位置</label>
        <input type="text" class="form-input" id="newLocation">
      </div>
      <div class="form-group">
        <label class="form-label">數量</label>
        <input type="number" class="form-input" id="newQty" value="1" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <input type="text" class="form-input" id="newNote">
      </div>
      <div class="form-group">
        <label class="form-label">照片路徑</label>
        <input type="text" class="form-input" id="newPhotoPath" placeholder="C:\\資料夾\\照片">
        <input type="file" id="newPhotoInput" accept="image/*" style="display:none" onchange="handleNewPhoto(event)">
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('newPhotoInput').click()" style="margin-top:4px">上傳照片</button>
        <img id="newPhotoPreview" style="max-width:120px;display:none;margin-top:4px">
      </div>
    </div>
  `;
  window._newItemAttrs = {};
  window._newItemPhoto = null;
}

let _newItemAttrs = {};
let _newItemPhoto = null;

function toggleNewOption(fieldId, value) {
  if (!_newItemAttrs[fieldId]) _newItemAttrs[fieldId] = [];
  const arr = _newItemAttrs[fieldId];
  const idx = arr.indexOf(value);
  if (idx > -1) arr.splice(idx, 1);
  else arr.push(value);
  // toggle visual
  document.querySelectorAll(`.field-options[data-field="${fieldId}"] .option-capsule`).forEach(el => {
    if (el.textContent.trim() === value) el.classList.toggle('active');
  });
}

function handleNewPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 500 * 1024) { alert('照片不能超過 500KB'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    _newItemPhoto = ev.target.result;
    document.getElementById('newPhotoPreview').src = _newItemPhoto;
    document.getElementById('newPhotoPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

async function saveNewItem() {
  const name = document.getElementById('newItemName')?.value?.trim();
  if (!name) { alert('請輸入品項名稱'); return; }
  const selectedFields = Object.keys(_newItemAttrs).filter(k => _newItemAttrs[k].length > 0);
  const data = {
    name,
    quantity: parseInt(document.getElementById('newQty')?.value) || 0,
    location: document.getElementById('newLocation')?.value?.trim() || '',
    note: document.getElementById('newNote')?.value?.trim() || '',
    photoPath: document.getElementById('newPhotoPath')?.value?.trim() || '',
    selectedFields,
    attributes: _newItemAttrs,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (_newItemPhoto) data.photo = _newItemPhoto;
  try {
    await DB.instance.collection(DB.ITEMS).add(data);
    await loadAllData();
    renderCapsules();
    renderEditArea();
    showStatus('✓ 新增成功', 'success');
  } catch (e) {
    showStatus('✗ 新增失敗', 'error');
  }
}
```

- [ ] **Step 1: 實作儲存、新增品項功能**

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: save and add item with all fields selection"
```

---

### Task 6: 後台設定模式 — 欄位管理（編輯區）

**Files:**
- Modify: `public/js/app.js`

**設定模式編輯區渲染、選項膠囊 CRUD：**

```js
// 在 renderEditArea() 的 settings 分支
// 改成 settings 模式時的編輯區

function renderEditArea() {
  const area = document.getElementById('editArea');
  if (!currentSelection) {
    area.innerHTML = '<div class="empty-state">請選擇上方品項或欄位</div>';
    return;
  }
  if (currentMode === 'inventory') {
    renderInventoryEdit(area);
  } else {
    renderSettingsEdit(area);
  }
}

function renderSettingsEdit(area) {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  const options = field.options || [];
  area.innerHTML = `
    <div class="edit-header">
      <span class="edit-title">${escapeHtml(field.name)}</span>
      <button class="btn btn-primary" onclick="saveFieldOptions()">儲存</button>
    </div>
    <div class="field-options" style="padding:12px 0">
      ${options.map((opt, i) => `
        <div class="option-capsule" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;margin:4px;background:white;border:1px solid var(--gray-300);border-radius:16px;font-size:0.85rem">
          <span class="drag-handle" draggable="true" data-index="${i}">≡</span>
          <span class="option-text" onclick="editOptionText(this)">${escapeHtml(opt)}</span>
          <span class="capsule-tools">
            <button onclick="editOptionText(this.parentElement.parentElement.querySelector('.option-text'))">✏️</button>
            <button onclick="deleteOption(${i})">🗑️</button>
          </span>
        </div>
      `).join('')}
    </div>
    <div style="padding:12px 0;border-top:1px solid var(--gray-200)">
      <label class="form-label">新增選項（每行一個）</label>
      <textarea id="newOptionsText" class="form-input" rows="3" placeholder="灰色&#10;金色&#10;銀色"></textarea>
      <button class="btn btn-outline btn-sm" onclick="addOptions()" style="margin-top:8px">+ 加入</button>
    </div>
  `;
}

function editOptionText(span) {
  const current = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.style.width = '120px';
  input.style.padding = '2px 8px';
  input.value = current;
  input.onblur = () => {
    const newVal = input.value.trim();
    if (newVal && newVal !== current) {
      const field = allFields.find(f => f.id === currentSelection);
      if (field) {
        const idx = Array.from(span.parentElement.parentElement.querySelectorAll('.option-text')).indexOf(span);
        if (idx > -1) field.options[idx] = newVal;
        renderSettingsEdit(document.getElementById('editArea'));
      }
    } else {
      input.replaceWith(span);
    }
  };
  input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') input.replaceWith(span); };
  span.replaceWith(input);
  input.focus();
}

function deleteOption(index) {
  const field = allFields.find(f => f.id === currentSelection);
  if (field && confirm('確定刪除？')) {
    field.options.splice(index, 1);
    renderSettingsEdit(document.getElementById('editArea'));
  }
}

function addOptions() {
  const text = document.getElementById('newOptionsText')?.value?.trim();
  if (!text) return;
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  const newOpts = text.split('\n').map(s => s.trim()).filter(s => s);
  field.options.push(...newOpts);
  document.getElementById('newOptionsText').value = '';
  renderSettingsEdit(document.getElementById('editArea'));
}

async function saveFieldOptions() {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  try {
    await DB.instance.collection(DB.FIELDS).doc(field.id).update({
      options: field.options
    });
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    showStatus('✗ 儲存失敗', 'error');
  }
}
```

**拖曳排序（HTML5 Drag & Drop）：**

```js
// 在 renderSettingsEdit 中為每個 drag-handle 加上監聽
// 並在全域處理 dragover / drop

document.addEventListener('dragstart', (e) => {
  const handle = e.target.closest('.drag-handle');
  if (handle) {
    e.dataTransfer.setData('text/plain', handle.dataset.index);
    e.target.closest('.option-capsule').style.opacity = '0.5';
  }
});
document.addEventListener('dragend', (e) => {
  const cap = e.target.closest('.option-capsule');
  if (cap) cap.style.opacity = '1';
});
document.addEventListener('dragover', (e) => {
  const cap = e.target.closest('.option-capsule');
  if (cap) e.preventDefault();
});
document.addEventListener('drop', (e) => {
  const target = e.target.closest('.option-capsule');
  if (!target) return;
  e.preventDefault();
  const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
  const toCapsules = Array.from(target.parentElement.querySelectorAll('.option-capsule'));
  const toIdx = toCapsules.indexOf(target);
  if (fromIdx === toIdx) return;
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  const [moved] = field.options.splice(fromIdx, 1);
  field.options.splice(toIdx, 0, moved);
  renderSettingsEdit(document.getElementById('editArea'));
});
```

- [ ] **Step 1: 實作設定模式編輯區（選項 CRUD + 拖曳排序）**

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: settings mode with option CRUD and drag sorting"
```

---

### Task 7: 後台設定模式 — 新增欄位

**Files:**
- Modify: `public/js/app.js`

```js
function openAddField() {
  const area = document.getElementById('editArea');
  area.innerHTML = `
    <div class="edit-header">
      <input type="text" id="newFieldName" class="form-input" style="max-width:300px;font-size:1.1rem;font-weight:600" placeholder="輸入欄位名稱">
      <button class="btn btn-primary" onclick="saveNewField()">儲存</button>
    </div>
    <div style="padding:12px 0">
      <label class="form-label">選項（每行一個）</label>
      <textarea id="newFieldOptions" class="form-input" rows="5" placeholder="紅色&#10;藍色&#10;白色"></textarea>
    </div>
  `;
}

async function saveNewField() {
  const name = document.getElementById('newFieldName')?.value?.trim();
  if (!name) { alert('請輸入欄位名稱'); return; }
  const optionsText = document.getElementById('newFieldOptions')?.value?.trim();
  const options = optionsText ? optionsText.split('\n').map(s => s.trim()).filter(s => s) : [];
  try {
    await DB.instance.collection(DB.FIELDS).doc(name).set({
      name,
      options,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadAllData();
    renderCapsules();
    currentSelection = name;
    renderEditArea();
    showStatus('✓ 欄位已新增', 'success');
  } catch (e) {
    showStatus('✗ 新增失敗', 'error');
  }
}
```

- [ ] **Step 1: 實作新增欄位功能**

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: add new field in settings mode"
```

---

### Task 8: Firestore 索引 + 規則更新

**Files:**
- Read: `firestore.indexes.json`
- Read: `firestore.rules`

```json
// firestore.indexes.json - 確保 inv_items 依 name 排序
{
  "indexes": [
    {
      "collectionGroup": "inv_items",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 1: 確認索引檔案正確**

- [ ] **Step 2: Commit**

```bash
git add firestore.indexes.json
git commit -m "chore: update firestore indexes for inv_items"
```

---

### Task 9: 最終整合測試 + 部署

- [ ] **Step 1: 在瀏覽器手動測試完整流程**
  - 切換模式
  - 搜尋功能
  - 新增品項、編輯、刪除
  - 新增欄位、編輯選項、拖曳排序

- [ ] **Step 2: 修正發現的問題**

- [ ] **Step 3: 上傳部署**

- [ ] **Step 4: 更新 網址.txt 確認 URL 正確**

---

### Task 10: 清理舊檔案

- [ ] **Step 1: 確認 settings.html 已刪除**

- [ ] **Step 2: 確認無殘留的 inv_settings/global 參考**

- [ ] **Step 3: 最終 commit**

```bash
git add -A
git commit -m "cleanup: remove legacy settings files"
git push origin master
git subtree push --prefix public origin gh-pages
```
