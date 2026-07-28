let currentMode = 'inventory';
let currentSelection = null;
let allFields = [];
let allItems = [];
let allUnits = [];
let selectedItemName = null;
let selectedAttrs = {};
let _dragSrcIndex = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
  renderCapsules();
  renderTable();
});

async function loadAllData() {
  const [fieldsSnap, itemsSnap, unitsSnap] = await Promise.all([
    DB.instance.collection(DB.FIELDS).orderBy('order').get(),
    DB.instance.collection(DB.ITEMS).orderBy('name').get(),
    DB.instance.collection(DB.UNITS).orderBy('createdAt', 'desc').get()
  ]);
  allFields = fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  allItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  allUnits = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function switchMode(mode) {
  currentMode = mode;
  currentSelection = null;
  selectedItemName = null;
  selectedAttrs = {};
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('searchInput').value = '';
  document.getElementById('searchInput').placeholder = mode === 'inventory'
    ? '搜尋品項名稱...'
    : '搜尋欄位名稱...';
  document.getElementById('fieldSelectArea').style.display = 'none';
  document.getElementById('inputArea').style.display = 'none';
  document.getElementById('tableArea').style.display = 'none';
  document.getElementById('settingsArea').innerHTML = '';
  renderCapsules();
  if (mode === 'inventory') renderTable();
}

function onSearch(query) {
  renderCapsules(query);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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

/* ============================================================
   INVENTORY MODE
   ============================================================ */

function renderCapsules(query) {
  const area = document.getElementById('capsuleArea');
  if (currentMode === 'settings') {
    renderSettingsCapsules(area, query);
    return;
  }
  const q = (query || '').toLowerCase();
  const filtered = q
    ? allItems.filter(item => item.name.toLowerCase().includes(q))
    : allItems;
  area.innerHTML = filtered.map(item => `
    <div class="capsule ${selectedItemName === item.name ? 'active' : ''}"
         onclick="selectItemName('${escapeHtml(item.name)}')">
      ${escapeHtml(item.name)}
    </div>
  `).join('') + `<button class="capsule-add" onclick="openAddItemName()">+</button>`;
}

function selectItemName(name) {
  if (selectedItemName === name) {
    selectedItemName = null;
    selectedAttrs = {};
    document.getElementById('fieldSelectArea').style.display = 'none';
    document.getElementById('inputArea').style.display = 'none';
  } else {
    selectedItemName = name;
    selectedAttrs = {};
    renderFieldSelectArea();
  }
  renderCapsules(document.getElementById('searchInput').value);
}

function renderFieldSelectArea() {
  const area = document.getElementById('fieldSelectArea');
  const visibleFields = allFields.filter(f => f.showInList);
  if (visibleFields.length === 0) {
    area.innerHTML = '<div class="empty-state">請先至後台設定勾選要顯示的欄位</div>';
    area.style.display = 'block';
    document.getElementById('inputArea').style.display = 'none';
    return;
  }

  const fieldRows = visibleFields.map((field, idx) => {
    const opts = (field.options || []).map(opt => {
      const isActive = (selectedAttrs[field.id] || []).includes(opt);
      return `<div class="option-capsule ${isActive ? 'active' : ''}"
                   onclick="toggleFieldOption('${encodeURIComponent(field.id)}','${encodeURIComponent(opt)}')">
                ${escapeHtml(opt)}
              </div>`;
    }).join('');
    const divider = idx < visibleFields.length - 1 ? '<div class="field-divider"></div>' : '';
    return `
      <div class="field-row">
        <div class="field-label">${escapeHtml(field.name)}</div>
        <div class="field-options">${opts}</div>
      </div>
      ${divider}
    `;
  }).join('');

  area.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-weight:600;font-size:1rem">${escapeHtml(selectedItemName)}</div>
      <button class="btn btn-primary" onclick="saveUnit()">儲存單位</button>
    </div>
    <div style="display:flex;gap:0;align-items:stretch">${fieldRows}</div>
  `;
  area.style.display = 'block';

  const inputArea = document.getElementById('inputArea');
  inputArea.innerHTML = `
    <div class="form-group">
      <label class="form-label">數量</label>
      <input type="number" class="form-input" id="unitQty" value="1" min="0">
    </div>
    <div class="form-group">
      <label class="form-label">擺放位置</label>
      <input type="text" class="form-input" id="unitLocation" placeholder="選填">
    </div>
    <div class="form-group">
      <label class="form-label">備註</label>
      <input type="text" class="form-input" id="unitNote" placeholder="選填">
    </div>
  `;
  inputArea.style.display = 'flex';
}

function toggleFieldOption(encodedFieldId, encodedValue) {
  const fieldId = decodeURIComponent(encodedFieldId);
  const value = decodeURIComponent(encodedValue);
  if (!selectedAttrs[fieldId]) selectedAttrs[fieldId] = [];
  const arr = selectedAttrs[fieldId];
  const idx = arr.indexOf(value);
  if (idx > -1) {
    arr.splice(idx, 1);
  } else {
    arr.push(value);
  }
  renderFieldSelectArea();
}

async function saveUnit() {
  if (!selectedItemName) { alert('請先選擇品項名稱'); return; }
  const visibleFields = allFields.filter(f => f.showInList);
  const fields = {};
  let hasSelection = false;
  for (const f of visibleFields) {
    const vals = selectedAttrs[f.id] || [];
    if (vals.length > 0) hasSelection = true;
    fields[f.name] = vals;
  }
  if (!hasSelection) { alert('請至少選擇一個欄位選項'); return; }
  const quantity = parseInt(document.getElementById('unitQty')?.value) || 0;
  const location = document.getElementById('unitLocation')?.value?.trim() || '';
  const note = document.getElementById('unitNote')?.value?.trim() || '';
  try {
    await DB.instance.collection(DB.UNITS).add({
      itemName: selectedItemName,
      fields,
      quantity,
      location,
      note,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    selectedAttrs = {};
    await loadAllData();
    renderFieldSelectArea();
    renderTable();
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    console.error('儲存失敗:', e);
    showStatus('✗ 儲存失敗', 'error');
  }
}

function renderTable() {
  if (currentMode !== 'inventory') return;
  const area = document.getElementById('tableArea');
  const visibleFields = allFields.filter(f => f.showInList);
  if (allUnits.length === 0) {
    area.innerHTML = '<div class="empty-state">尚無存入資料</div>';
    area.style.display = 'block';
    return;
  }
  const headers = visibleFields.map(f => `<th>${escapeHtml(f.name)}</th>`).join('');
  const rows = allUnits.map(unit => {
    const cells = visibleFields.map(f => {
      const vals = (unit.fields && unit.fields[f.name]) || [];
      return `<td>${escapeHtml(vals.join(', '))}</td>`;
    }).join('');
    return `<tr>
      <td>${escapeHtml(unit.itemName)}</td>
      ${cells}
      <td>${unit.quantity || 0}</td>
      <td>${escapeHtml(unit.location || '')}</td>
      <td>${escapeHtml(unit.note || '')}</td>
      <td class="col-actions">
        <button class="btn-icon" onclick="deleteUnit('${unit.id}')" title="刪除">🗑️</button>
      </td>
    </tr>`;
  }).join('');
  area.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>名稱</th>
          ${headers}
          <th>數量</th>
          <th>位置</th>
          <th>備註</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
  area.style.display = 'block';
}

async function deleteUnit(id) {
  if (!confirm('確定刪除此筆資料？')) return;
  try {
    await DB.instance.collection(DB.UNITS).doc(id).delete();
    allUnits = allUnits.filter(u => u.id !== id);
    renderTable();
    showStatus('✓ 已刪除', 'success');
  } catch (e) {
    console.error('刪除失敗:', e);
    showStatus('✗ 刪除失敗', 'error');
  }
}

function openAddItemName() {
  const area = document.getElementById('settingsArea');
  area.innerHTML = `
    <div class="edit-header">
      <input type="text" id="newItemNameInput" class="form-input" style="max-width:300px;font-size:1.1rem;font-weight:600" placeholder="輸入品項名稱">
      <button class="btn btn-primary" onclick="saveNewItemName()">儲存</button>
    </div>
  `;
}

async function saveNewItemName() {
  const name = document.getElementById('newItemNameInput')?.value?.trim();
  if (!name) { alert('請輸入品項名稱'); return; }
  try {
    await DB.instance.collection(DB.ITEMS).doc(name).set({
      name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadAllData();
    document.getElementById('settingsArea').innerHTML = '';
    renderCapsules();
    showStatus('✓ 新增成功', 'success');
  } catch (e) {
    console.error('新增失敗:', e);
    showStatus('✗ 新增失敗', 'error');
  }
}

/* ============================================================
   SETTINGS MODE
   ============================================================ */

function renderSettingsCapsules(area, query) {
  const q = (query || '').toLowerCase();
  const filtered = q
    ? allFields.filter(f => f.name.toLowerCase().includes(q))
    : allFields;
  area.innerHTML = filtered.map(f => `
    <div class="capsule ${currentSelection === f.id ? 'active' : ''}"
         onclick="selectField('${encodeURIComponent(f.id)}')">
      ${escapeHtml(f.name)}
    </div>
  `).join('') + `<button class="capsule-add" onclick="openAddField()">+</button>`;
}

function selectField(encodedId) {
  const id = decodeURIComponent(encodedId);
  currentSelection = currentSelection === id ? null : id;
  renderSettingsCapsules(document.getElementById('capsuleArea'), document.getElementById('searchInput').value);
  renderSettingsPanel();
}

function renderSettingsPanel() {
  const area = document.getElementById('settingsArea');
  document.getElementById('fieldSelectArea').style.display = 'none';
  document.getElementById('inputArea').style.display = 'none';
  document.getElementById('tableArea').style.display = 'none';

  if (!currentSelection) {
    renderFieldList(area);
    return;
  }

  const field = allFields.find(f => f.id === currentSelection);
  if (!field) {
    area.innerHTML = '<div class="empty-state">找不到欄位</div>';
    return;
  }

  const options = field.options || [];
  const optionTags = options.map((opt, i) => `
    <div class="option-tag" draggable="true" data-index="${i}">
      <span class="drag-handle">≡</span>
      <span class="option-text" onclick="editOptionText(this, ${i})">${escapeHtml(opt)}</span>
      <button class="btn-delete" onclick="deleteOption(${i})">✕</button>
    </div>
  `).join('');

  area.innerHTML = `
    <div class="options-panel">
      <div class="panel-header">
        <div class="panel-title">${escapeHtml(field.name)} — 選項管理</div>
        <button class="btn btn-outline btn-sm" onclick="currentSelection=null;renderSettingsPanel()">← 返回欄位列表</button>
      <button class="btn btn-primary btn-sm" onclick="saveFieldOptions()">儲存選項</button>
      </div>
      <div class="option-list" id="optionList">${optionTags}</div>
      <div class="add-row">
        <div class="form-group">
          <label class="form-label">新增選項（用 - 分隔）</label>
          <input type="text" id="newOptionsText" class="form-input" placeholder="選項A-選項B-選項C">
        </div>
        <button class="btn btn-primary btn-sm" onclick="addOptions()" style="margin-bottom:16px">+ 加入</button>
      </div>
    </div>
  `;
  setupOptionDragSort();
}

function renderFieldList(area) {
  const sorted = [...allFields].sort((a, b) => (a.order || 0) - (b.order || 0));
  const items = sorted.map((f, i) => `
    <div class="field-list-item" data-id="${f.id}" data-index="${i}">
      <span class="drag-handle" draggable="true" data-index="${i}">≡</span>
      <span class="field-name" onclick="selectField('${encodeURIComponent(f.id)}')">${escapeHtml(f.name)}</span>
      <label class="field-toggle">
        <input type="checkbox" ${f.showInList ? 'checked' : ''} onchange="toggleShowInList('${encodeURIComponent(f.id)}', this.checked)">
        顯示在庫存列表
      </label>
      <button class="btn-icon" onclick="deleteField('${encodeURIComponent(f.id)}')" title="刪除欄位">🗑️</button>
    </div>
  `).join('');

  area.innerHTML = `
    <div class="field-list">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-weight:600;font-size:1rem">欄位設定</div>
        <button class="btn btn-primary btn-sm" onclick="openAddField()">+ 新增欄位</button>
      </div>
      <div id="fieldListContainer">${items}</div>
    </div>
  `;
  setupFieldDragSort();
}

function setupFieldDragSort() {
  const container = document.getElementById('fieldListContainer');
  if (!container) return;
  container.querySelectorAll('.field-list-item').forEach(el => {
    const handle = el.querySelector('.drag-handle');
    handle.addEventListener('dragstart', (e) => {
      _dragSrcIndex = parseInt(e.target.dataset.index);
      el.style.opacity = '0.5';
    });
    handle.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', (e) => { e.preventDefault(); });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const toIdx = parseInt(el.dataset.index);
      if (_dragSrcIndex === null || _dragSrcIndex === toIdx) return;
      reorderFields(_dragSrcIndex, toIdx);
      _dragSrcIndex = null;
    });
  });
}

async function reorderFields(fromIdx, toIdx) {
  const sorted = [...allFields].sort((a, b) => (a.order || 0) - (b.order || 0));
  const [moved] = sorted.splice(fromIdx, 1);
  sorted.splice(toIdx, 0, moved);
  const batch = DB.instance.batch();
  sorted.forEach((f, i) => {
    const ref = DB.instance.collection(DB.FIELDS).doc(f.id);
    batch.update(ref, { order: i });
    f.order = i;
  });
  await batch.commit();
  renderFieldList(document.getElementById('settingsArea'));
}

async function toggleShowInList(encodedId, checked) {
  const id = decodeURIComponent(encodedId);
  try {
    await DB.instance.collection(DB.FIELDS).doc(id).update({ showInList: checked });
    const field = allFields.find(f => f.id === id);
    if (field) field.showInList = checked;
  } catch (e) {
    console.error('更新失敗:', e);
  }
}

async function deleteField(encodedId) {
  const id = decodeURIComponent(encodedId);
  if (!confirm('確定刪除此欄位？')) return;
  try {
    await DB.instance.collection(DB.FIELDS).doc(id).delete();
    allFields = allFields.filter(f => f.id !== id);
    renderFieldList(document.getElementById('settingsArea'));
    showStatus('✓ 已刪除', 'success');
  } catch (e) {
    console.error('刪除失敗:', e);
    showStatus('✗ 刪除失敗', 'error');
  }
}

function openAddField() {
  const area = document.getElementById('settingsArea');
  area.innerHTML = `
    <div class="edit-header">
      <input type="text" id="newFieldName" class="form-input" style="max-width:300px;font-size:1.1rem;font-weight:600" placeholder="輸入欄位名稱">
      <button class="btn btn-primary" onclick="saveNewField()">儲存</button>
    </div>
    <div style="padding:12px 0">
      <label class="form-label">選項（用 - 分隔，例：紅色-黃色-綠色）</label>
      <input type="text" id="newFieldOptions" class="form-input" placeholder="選項A-選項B-選項C" style="margin-top:4px">
    </div>
  `;
}

async function saveNewField() {
  const name = document.getElementById('newFieldName')?.value?.trim();
  if (!name) { alert('請輸入欄位名稱'); return; }
  const optionsText = document.getElementById('newFieldOptions')?.value?.trim();
  const options = optionsText ? optionsText.split('-').map(s => s.trim()).filter(s => s) : [];
  const maxOrder = allFields.reduce((max, f) => Math.max(max, f.order || 0), -1);
  try {
    await DB.instance.collection(DB.FIELDS).doc(name).set({
      name,
      options,
      order: maxOrder + 1,
      showInList: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await loadAllData();
    currentSelection = name;
    renderSettingsCapsules(document.getElementById('capsuleArea'), document.getElementById('searchInput').value);
    renderSettingsPanel();
    showStatus('✓ 欄位已新增', 'success');
  } catch (e) {
    console.error('新增欄位失敗:', e);
    showStatus('✗ 新增失敗', 'error');
  }
}

function editOptionText(span, index) {
  const current = span.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-input';
  input.style.width = '120px';
  input.style.padding = '2px 8px';
  input.style.display = 'inline-block';
  input.value = current;
  const finishEdit = () => {
    const newVal = input.value.trim();
    if (newVal && newVal !== current) {
      const field = allFields.find(f => f.id === currentSelection);
      if (field && index < field.options.length) {
        field.options[index] = newVal;
        renderSettingsPanel();
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

function deleteOption(index) {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  if (confirm('確定刪除此選項？')) {
    field.options.splice(index, 1);
    renderSettingsPanel();
  }
}

function addOptions() {
  const text = document.getElementById('newOptionsText')?.value?.trim();
  if (!text) return;
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  const newOpts = text.split('-').map(s => s.trim()).filter(s => s);
  if (newOpts.length === 0) return;
  field.options.push(...newOpts);
  document.getElementById('newOptionsText').value = '';
  renderSettingsPanel();
}

async function saveFieldOptions() {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  try {
    await DB.instance.collection(DB.FIELDS).doc(field.id).set({
      name: field.name,
      options: field.options,
      order: field.order || 0,
      showInList: field.showInList || false
    }, { merge: true });
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    console.error('儲存失敗:', e);
    showStatus('✗ 儲存失敗', 'error');
  }
}

function setupOptionDragSort() {
  const list = document.getElementById('optionList');
  if (!list) return;
  list.querySelectorAll('.option-tag').forEach(el => {
    const handle = el.querySelector('.drag-handle');
    handle.addEventListener('dragstart', (e) => {
      _dragSrcIndex = parseInt(e.target.closest('.option-tag').dataset.index);
      el.style.opacity = '0.5';
    });
    handle.addEventListener('dragend', () => { el.style.opacity = '1'; });
    el.addEventListener('dragover', (e) => { e.preventDefault(); });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const toIdx = parseInt(el.dataset.index);
      if (_dragSrcIndex === null || _dragSrcIndex === toIdx) return;
      const field = allFields.find(f => f.id === currentSelection);
      if (!field) return;
      const [moved] = field.options.splice(_dragSrcIndex, 1);
      field.options.splice(toIdx, 0, moved);
      _dragSrcIndex = null;
      renderSettingsPanel();
    });
  });
}
