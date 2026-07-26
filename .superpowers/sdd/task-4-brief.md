# Task 4: 庫存模式 — 編輯區渲染

## Files
- Modify: `public/js/app.js`

## Context from Tasks 1-3

The current `public/js/app.js` has these existing functions (DO NOT change these):
- `currentMode`, `currentSelection`, `allItems`, `allFields` globals
- `loadAllData()` - loads from Firestore
- `switchMode(mode)` - toggles mode
- `onSearch(query)` - filters capsules
- `renderCapsules(query)` - renders name capsules
- `selectCapsule(encodedId)` - selects a capsule
- `renderEditArea()` - currently a placeholder (YOU WILL REPLACE THIS)
- `openAddNew()` - dispatches to add functions
- `openAddItem()` / `openAddField()` - placeholders
- `escapeHtml(str)` - HTML escaping

Also available globally: `DB` (from db.js) with `DB.instance`, `DB.FIELDS`, `DB.ITEMS`.

## What to do

### 1. Replace `renderEditArea()` with the full inventory implementation

When `currentMode === 'inventory'` and `currentSelection` is set:

```js
function renderEditArea() {
  const area = document.getElementById('editArea');
  if (!currentSelection) {
    area.innerHTML = '<div class="empty-state">請選擇上方品項</div>';
    return;
  }
  if (currentMode === 'settings') {
    area.innerHTML = '<div class="empty-state">後台設定模式（待實作）</div>';
    return;
  }

  // --- Inventory mode ---
  const item = allItems.find(i => i.id === currentSelection);
  if (!item) {
    area.innerHTML = '<div class="empty-state">找不到品項</div>';
    return;
  }

  const selectedFields = item.selectedFields || [];
  const attributes = item.attributes || {};

  // Generate field blocks - only for fields in selectedFields
  const fieldBlocks = selectedFields.map(fieldName => {
    const field = allFields.find(f => f.id === fieldName);
    if (!field) return '';
    const selectedVals = attributes[fieldName] || [];
    const optionsHtml = (field.options || []).map(opt => {
      const isActive = selectedVals.includes(opt);
      return `<div class="option-capsule ${isActive ? 'active' : ''}"
                    onclick="toggleOption('${encodeURIComponent(fieldName)}','${encodeURIComponent(opt)}')">
               ${escapeHtml(opt)}
             </div>`;
    }).join('');
    return `
      <div class="field-block">
        <div class="field-block-title">${escapeHtml(field.name)}</div>
        <div class="field-options">${optionsHtml}</div>
      </div>
    `;
  }).join('');

  area.innerHTML = `
    <div class="edit-header">
      <span class="edit-title">${escapeHtml(item.name)}</span>
      <span id="saveStatus" class="save-status"></span>
      <button class="btn btn-primary" onclick="saveItem()">儲存</button>
    </div>
    <div class="field-grid">${fieldBlocks}</div>
    <div class="edit-footer">
      <div class="form-group">
        <label class="form-label">擺放位置</label>
        <input type="text" class="form-input" id="editLocation" value="${escapeHtml(item.location || '')}">
      </div>
      <div class="photo-block">
        ${item.photo
          ? `<img src="${item.photo}" style="max-width:120px;max-height:120px;border-radius:4px;cursor:pointer" onclick="navigator.clipboard.writeText('${escapeHtml(item.photoPath || '')}')">
             <div class="photo-path">${escapeHtml(item.photoPath || '')}</div>`
          : '<div class="empty-state" style="padding:10px">無照片</div>'}
      </div>
      <div class="form-group">
        <label class="form-label">數量</label>
        <input type="number" class="form-input" id="editQty" value="${item.quantity || 0}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <input type="text" class="form-input" id="editNote" value="${escapeHtml(item.note || '')}">
      </div>
    </div>
  `;
}
```

### 2. Add `toggleOption()` function

This function toggles a capsule's active state for the currently selected item:

```js
function toggleOption(encodedFieldName, encodedValue) {
  const fieldName = decodeURIComponent(encodedFieldName);
  const value = decodeURIComponent(encodedValue);
  const item = allItems.find(i => i.id === currentSelection);
  if (!item) return;
  if (!item.attributes) item.attributes = {};
  if (!item.attributes[fieldName]) item.attributes[fieldName] = [];
  const arr = item.attributes[fieldName];
  const idx = arr.indexOf(value);
  if (idx > -1) {
    arr.splice(idx, 1);
  } else {
    arr.push(value);
  }
  // Important: Update Firestore doc's in-memory data, then re-render
  // (actual Firestore save happens when user clicks "儲存")
  renderEditArea();
}
```

### 3. Place `toggleOption` after `renderEditArea()` in the file.

### 4. Keep ALL existing functions intact. Only modify `renderEditArea()` and add `toggleOption()`.

### Commit:
```bash
git add public/js/app.js
git commit -m "feat: inventory edit area with field blocks and option toggle"
```
