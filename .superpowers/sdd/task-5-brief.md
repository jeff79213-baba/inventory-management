# Task 5: 儲存品項 + 新增品項

## Files
- Modify: `public/js/app.js`

## Context from Tasks 1-4

Current `public/js/app.js` has these existing functions (DO NOT change existing signatures):
- `currentMode`, `currentSelection`, `allItems`, `allFields` (globals)
- `loadAllData()` - loads from Firestore
- `switchMode(mode)` - toggles mode
- `onSearch(query)` - filters capsules
- `renderCapsules(query)` - renders name capsules
- `selectCapsule(encodedId)` - selects a capsule
- `renderEditArea()` - renders inventory edit area (Task 4)
- `toggleOption(encodedFieldName, encodedValue)` - toggles option caps (Task 4)
- `openAddNew()` - dispatches to openAddItem/openAddField
- `openAddItem()` - currently placeholder: `document.getElementById('editArea').innerHTML = '...'`
- `openAddField()` - placeholder
- `escapeHtml(str)` - HTML escaping

Also available globally: `DB` (from db.js) with `DB.instance`, `DB.FIELDS`, `DB.ITEMS`.

## What to do

Add the following functions to `public/js/app.js` (append after the existing functions, before the final line):

### 1. Add `showStatus(msg, cls)` helper

```js
function showStatus(msg, cls) {
  const existing = document.querySelector('.save-status');
  if (existing) {
    existing.textContent = msg;
    existing.className = `save-status ${cls}`;
    return;
  }
  const el = document.createElement('span');
  el.className = `save-status ${cls}`;
  el.textContent = msg;
  const header = document.querySelector('.edit-header');
  if (header) header.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.remove(); }, 2000);
}
```

### 2. Add `saveItem()` function

Saves the currently selected item's in-memory data to Firestore:

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
    console.error('儲存失敗:', e);
    showStatus('✗ 儲存失敗', 'error');
  }
}
```

### 3. Replace `openAddItem()` with full implementation

Replace the placeholder with the full new-item form:

```js
let _newItemAttrs = {};
let _newItemPhoto = null;

function openAddItem() {
  _newItemAttrs = {};
  _newItemPhoto = null;
  const area = document.getElementById('editArea');
  const fieldBlocks = allFields.map(f => {
    const optionsHtml = (f.options || []).map(opt =>
      `<div class="option-capsule" onclick="toggleNewOption('${encodeURIComponent(f.id)}','${encodeURIComponent(opt)}')">${escapeHtml(opt)}</div>`
    ).join('');
    return `
      <div class="field-block">
        <div class="field-block-title">${escapeHtml(f.name)}</div>
        <div class="field-options" data-field="${encodeURIComponent(f.id)}">${optionsHtml}</div>
      </div>
    `;
  }).join('');

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
        <button class="btn btn-outline btn-sm" type="button" onclick="document.getElementById('newPhotoInput').click()" style="margin-top:4px">上傳照片</button>
        <img id="newPhotoPreview" style="max-width:120px;display:none;margin-top:4px">
      </div>
    </div>
  `;
}
```

### 4. Add `toggleNewOption(encodedFieldId, encodedValue)`

```js
function toggleNewOption(encodedFieldId, encodedValue) {
  const fieldId = decodeURIComponent(encodedFieldId);
  const value = decodeURIComponent(encodedValue);
  if (!_newItemAttrs[fieldId]) _newItemAttrs[fieldId] = [];
  const arr = _newItemAttrs[fieldId];
  const idx = arr.indexOf(value);
  if (idx > -1) {
    arr.splice(idx, 1);
  } else {
    arr.push(value);
  }
  // Toggle visual
  const caps = document.querySelectorAll(`.field-options[data-field="${encodedFieldId}"] .option-capsule`);
  caps.forEach(el => {
    if (el.textContent.trim() === value) el.classList.toggle('active');
  });
}
```

### 5. Add `handleNewPhoto(e)`

```js
function handleNewPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 500 * 1024) { alert('照片不能超過 500KB'); return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    _newItemPhoto = ev.target.result;
    const preview = document.getElementById('newPhotoPreview');
    if (preview) { preview.src = _newItemPhoto; preview.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
}
```

### 6. Add `saveNewItem()`

```js
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
    // Reload data and reset UI
    const [itemsSnap] = await Promise.all([
      DB.instance.collection(DB.ITEMS).orderBy('name').get()
    ]);
    allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    currentSelection = null;
    renderCapsules(document.getElementById('searchInput').value);
    renderEditArea();
    showStatus('✓ 新增成功', 'success');
  } catch (e) {
    console.error('新增失敗:', e);
    showStatus('✗ 新增失敗', 'error');
  }
}
```

### Commit:
```bash
git add public/js/app.js
git commit -m "feat: save and add item with all fields selection"
```
