# Task 7: 後台設定 — 新增欄位

## Files
- Modify: `public/js/app.js`

## Context

Current `public/js/app.js` (435 lines) has settings mode editing working in Task 6. But `openAddField()` is still a placeholder:
```js
function openAddField() {
  document.getElementById('editArea').innerHTML = '<div class="empty-state">新增欄位（待實作）</div>';
}
```

Replace it with a full "add new field" form.

Existing functions you MUST NOT change: ALL functions from Tasks 1-6.

## What to do

### Replace `openAddField()`:

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
      <textarea id="newFieldOptions" class="form-input" rows="5" placeholder="紅色&#10;藍色&#10;白色" style="margin-top:4px"></textarea>
    </div>
  `;
}
```

### Add `saveNewField()`:

```js
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
    // Reload fields
    const fieldsSnap = await DB.instance.collection(DB.FIELDS).orderBy('name').get();
    allFields = fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    currentSelection = name;
    renderCapsules(document.getElementById('searchInput').value);
    renderEditArea();
    showStatus('✓ 欄位已新增', 'success');
  } catch (e) {
    console.error('新增欄位失敗:', e);
    showStatus('✗ 新增失敗', 'error');
  }
}
```

Add `saveNewField()` after `openAddField()`.

### Commit:
```bash
git add public/js/app.js
git commit -m "feat: add new field in settings mode"
```
