# Task 3: Core JS — 模式切換 + 資料載入

## Files
- Create: `public/js/app.js`

## What to do

Create `public/js/app.js` from scratch. This is the main JS file for the new single-page app.

### Required functions and variables:

```js
let currentMode = 'inventory';  // 'inventory' | 'settings'
let currentSelection = null;     // selected item/field ID
let allItems = [];               // items from Firestore
let allFields = [];              // fields from Firestore

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
  document.getElementById('searchInput').placeholder = mode === 'inventory'
    ? '搜尋品項名稱、欄位值、位置、備註...'
    : '搜尋欄位名稱...';
  renderCapsules();
  renderEditArea();
}

function onSearch(query) {
  renderCapsules(query);
}

function renderCapsules(query) {
  const area = document.getElementById('capsuleArea');
  const list = currentMode === 'inventory' ? allItems : allFields;
  const q = (query || '').toLowerCase();
  const filtered = q
    ? list.filter(item => JSON.stringify(item).toLowerCase().includes(q))
    : list;
  area.innerHTML = filtered.map(item => `
    <div class="capsule ${currentSelection === item.id ? 'active' : ''}"
         onclick="selectCapsule('${item.id}')">
      ${escapeHtml(item.name)}
    </div>
  `).join('') + `<button class="capsule-add" onclick="openAddNew()">+</button>`;
}

function selectCapsule(id) {
  currentSelection = currentSelection === id ? null : id;
  renderCapsules(document.getElementById('searchInput').value);
  renderEditArea();
}

function renderEditArea() {
  const area = document.getElementById('editArea');
  if (!currentSelection) {
    area.innerHTML = '<div class="empty-state">請選擇上方品項</div>';
    return;
  }
  // Settings mode handled in later tasks
  if (currentMode === 'settings') {
    area.innerHTML = '<div class="empty-state">後台設定模式（待實作）</div>';
    return;
  }
  // Inventory mode handled in Task 4
  area.innerHTML = '<div class="empty-state">庫存編輯區（待實作）</div>';
}

function openAddNew() {
  if (currentMode === 'inventory') {
    openAddItem();
  } else {
    openAddField();
  }
}

function openAddItem() {
  // Will be implemented in Task 5
  document.getElementById('editArea').innerHTML = '<div class="empty-state">新增品項（待實作）</div>';
}

function openAddField() {
  // Will be implemented in Task 7
  document.getElementById('editArea').innerHTML = '<div class="empty-state">新增欄位（待實作）</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

### Key points:
- Use `DB.instance` from `db.js` (not raw `firebase.firestore()`)
- `renderEditArea()` is a placeholder for now - Tasks 4-7 will fill it in
- All functions must be globally accessible (no module exports - this is compat mode)
- `escapeHtml()` is required for XSS safety
- The `id` passed to `selectCapsule` must handle special characters - use `escapeHtml` for display, but use data attributes for reliable ID storage in production

Important: Since item IDs and field IDs from Firestore could contain special characters that break onclick strings, use `encodeURIComponent(id)` in the onclick and `decodeURIComponent` when reading back. For example:

```js
area.innerHTML = filtered.map(item => `
  <div class="capsule ${currentSelection === item.id ? 'active' : ''}"
       onclick="selectCapsule('${encodeURIComponent(item.id)}')">
    ${escapeHtml(item.name)}
  </div>
`).join('') + `<button class="capsule-add" onclick="openAddNew()">+</button>`;
```

And:
```js
function selectCapsule(encodedId) {
  const id = decodeURIComponent(encodedId);
  currentSelection = currentSelection === id ? null : id;
  renderCapsules(document.getElementById('searchInput').value);
  renderEditArea();
}
```

### Commit:
```bash
git add public/js/app.js
git commit -m "feat: core app with mode switching and capsule rendering"
```

## Dependencies
- Uses `DB` from `db.js` (created in Task 1)
- Uses `firebase.firestore()` already initialized in `config.js`
- HTML already has the required DOM elements (Task 2)
