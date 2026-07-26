# Task 6: 後台設定模式 — 選項 CRUD + 拖曳排序

## Files
- Modify: `public/js/app.js`

## Context from Tasks 1-5

Current `public/js/app.js` (311 lines) has the inventory mode fully working. The settings mode branch in `renderEditArea()` still shows a placeholder.

Existing functions you MUST NOT change:
- `currentMode`, `currentSelection`, `allItems`, `allFields` (globals)
- `loadAllData()`, `switchMode(mode)`, `onSearch(query)`
- `renderCapsules(query)`, `selectCapsule(encodedId)`
- `renderEditArea()` — **YOU WILL MODIFY** the settings branch of this function
- `toggleOption()`, `openAddNew()`, `openAddItem()`, `openAddField()`
- `showStatus()`, `saveItem()`, `toggleNewOption()`, `handleNewPhoto()`, `saveNewItem()`
- `escapeHtml(str)`, `_newItemAttrs`, `_newItemPhoto`

## What to do

### 1. Modify `renderEditArea()` — settings branch

Currently at line ~64, replace:
```js
if (currentMode === 'settings') {
  area.innerHTML = '<div class="empty-state">後台設定模式（待實作）</div>';
  return;
}
```

With:
```js
if (currentMode === 'settings') {
  renderSettingsEdit(area);
  return;
}
```

### 2. Add `renderSettingsEdit(area)` function

Add this new function after `renderEditArea()`:

```js
function renderSettingsEdit(area) {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) {
    area.innerHTML = '<div class="empty-state">請選擇上方欄位</div>';
    return;
  }
  const options = field.options || [];
  area.innerHTML = `
    <div class="edit-header">
      <span class="edit-title">${escapeHtml(field.name)}</span>
      <span id="saveStatus" class="save-status"></span>
      <button class="btn btn-primary" onclick="saveFieldOptions()">儲存</button>
    </div>
    <div class="field-options" style="padding:12px 0;display:flex;flex-wrap:wrap;gap:8px">
      ${options.map((opt, i) => `
        <div class="option-capsule" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:white;border:1px solid var(--gray-300);border-radius:16px;font-size:0.85rem" draggable="true" data-index="${i}">
          <span class="drag-handle" style="cursor:grab;color:var(--gray-500);user-select:none">≡</span>
          <span class="option-text" onclick="editOptionText(this, ${i})">${escapeHtml(opt)}</span>
          <span class="capsule-tools">
            <button onclick="editOptionText(this.parentElement.parentElement.querySelector('.option-text'), ${i})" title="編輯" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--gray-500)">✏️</button>
            <button onclick="deleteOption(${i})" title="刪除" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--gray-500)">🗑️</button>
          </span>
        </div>
      `).join('')}
    </div>
    <div style="padding:12px 0;border-top:1px solid var(--gray-200)">
      <label class="form-label">新增選項（每行一個）</label>
      <textarea id="newOptionsText" class="form-input" rows="3" placeholder="灰色&#10;金色&#10;銀色" style="margin-top:4px"></textarea>
      <button class="btn btn-outline btn-sm" onclick="addOptions()" style="margin-top:8px">+ 加入</button>
    </div>
  `;
  setupDragSort();
}
```

### 3. Add `editOptionText(span, index)`

```js
function editOptionText(span, index) {
  const current = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.style.width = '120px';
  input.style.padding = '2px 8px';
  input.value = current;
  const finishEdit = () => {
    const newVal = input.value.trim();
    if (newVal && newVal !== current) {
      const field = allFields.find(f => f.id === currentSelection);
      if (field && index < field.options.length) {
        field.options[index] = newVal;
        renderSettingsEdit(document.getElementById('editArea'));
      }
    } else {
      input.replaceWith(span);
    }
  };
  input.onblur = finishEdit;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finishEdit(); }
    if (e.key === 'Escape') { input.replaceWith(span); }
  };
  span.replaceWith(input);
  input.focus();
  input.select();
}
```

### 4. Add `deleteOption(index)`

```js
function deleteOption(index) {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  if (confirm('確定刪除此選項？')) {
    field.options.splice(index, 1);
    renderSettingsEdit(document.getElementById('editArea'));
  }
}
```

### 5. Add `addOptions()`

```js
function addOptions() {
  const text = document.getElementById('newOptionsText')?.value?.trim();
  if (!text) return;
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  const newOpts = text.split('\n').map(s => s.trim()).filter(s => s);
  if (newOpts.length === 0) return;
  field.options.push(...newOpts);
  document.getElementById('newOptionsText').value = '';
  renderSettingsEdit(document.getElementById('editArea'));
}
```

### 6. Add `saveFieldOptions()`

```js
async function saveFieldOptions() {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  try {
    await DB.instance.collection(DB.FIELDS).doc(field.id).update({
      options: field.options
    });
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    console.error('儲存失敗:', e);
    showStatus('✗ 儲存失敗', 'error');
  }
}
```

### 7. Add `setupDragSort()` and drag event handlers

Add these global drag handlers:

```js
function setupDragSort() {
  const area = document.getElementById('editArea');
  if (!area) return;
  area.querySelectorAll('.option-capsule[draggable]').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.index);
      el.style.opacity = '0.5';
    });
    el.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', (e) => { e.preventDefault(); });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toCapsules = Array.from(area.querySelectorAll('.option-capsule[draggable]'));
      const toIdx = toCapsules.indexOf(el);
      if (fromIdx === toIdx || isNaN(fromIdx) || isNaN(toIdx)) return;
      const field = allFields.find(f => f.id === currentSelection);
      if (!field) return;
      const [moved] = field.options.splice(fromIdx, 1);
      field.options.splice(toIdx, 0, moved);
      renderSettingsEdit(document.getElementById('editArea'));
    });
  });
}
```

Add all new functions after `renderEditArea()` and before `openAddNew()`.

### Commit:
```bash
git add public/js/app.js
git commit -m "feat: settings mode with option CRUD and drag sorting"
```
