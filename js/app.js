let currentMode = 'inventory';
let currentSelection = null;
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
         onclick="selectCapsule('${encodeURIComponent(item.id)}')">
      ${escapeHtml(item.name)}
    </div>
  `).join('') + `<button class="capsule-add" onclick="openAddNew()">+</button>`;
}

function selectCapsule(encodedId) {
  const id = decodeURIComponent(encodedId);
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
  if (currentMode === 'settings') {
    renderSettingsEdit(area);
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
      <label class="form-label">新增選項（用 - 分隔，例：紅色-黃色-綠色）</label>
      <input type="text" id="newOptionsText" class="form-input" placeholder="紅色-黃色-綠色" style="margin-top:4px">
      <button class="btn btn-outline btn-sm" onclick="addOptions()" style="margin-top:8px">+ 加入</button>
    </div>
  `;
  setupDragSort();
  addDataTools();
}

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

function deleteOption(index) {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  if (confirm('確定刪除此選項？')) {
    field.options.splice(index, 1);
    renderSettingsEdit(document.getElementById('editArea'));
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
  renderSettingsEdit(document.getElementById('editArea'));
}

async function saveFieldOptions() {
  const field = allFields.find(f => f.id === currentSelection);
  if (!field) return;
  try {
    await DB.instance.collection(DB.FIELDS).doc(field.id).set({
      name: field.name,
      options: field.options
    }, { merge: true });
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    console.error('儲存失敗:', e);
    showStatus('✗ 儲存失敗', 'error');
  }
}

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
  renderEditArea();
}

function openAddNew() {
  if (currentMode === 'inventory') {
    openAddItem();
  } else {
    openAddField();
  }
}

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

function openAddField() {
  const area = document.getElementById('editArea');
  area.innerHTML = `
    <div class="edit-header">
      <input type="text" id="newFieldName" class="form-input" style="max-width:300px;font-size:1.1rem;font-weight:600" placeholder="輸入欄位名稱">
      <button class="btn btn-primary" onclick="saveNewField()">儲存</button>
    </div>
    <div style="padding:12px 0">
      <label class="form-label">選項（用 - 分隔，例：紅色-黃色-綠色）</label>
      <input type="text" id="newFieldOptions" class="form-input" placeholder="紅色-黃色-綠色" style="margin-top:4px">
    </div>
  `;
}

async function saveNewField() {
  const name = document.getElementById('newFieldName')?.value?.trim();
  if (!name) { alert('請輸入欄位名稱'); return; }
  const optionsText = document.getElementById('newFieldOptions')?.value?.trim();
  const options = optionsText ? optionsText.split('-').map(s => s.trim()).filter(s => s) : [];
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

let _newItemAttrs = {};
let _newItemPhoto = null;

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
  const caps = document.querySelectorAll(`.field-options[data-field="${encodedFieldId}"] .option-capsule`);
  caps.forEach(el => {
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
    const preview = document.getElementById('newPhotoPreview');
    if (preview) { preview.src = _newItemPhoto; preview.style.display = 'block'; }
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

// === 資料匯入匯出 ===
function addDataTools() {
  const area = document.getElementById('editArea');
  if (currentMode !== 'settings') return;
  const toolsHtml = `
    <div style="margin-top:16px;padding:16px;border-top:2px solid var(--gray-200);display:flex;gap:12px;align-items:center">
      <span style="font-weight:600;font-size:0.9rem;color:var(--gray-700)">資料管理：</span>
      <button class="btn btn-outline btn-sm" onclick="exportAllData()">📥 匯出全部資料</button>
      <button class="btn btn-outline btn-sm" onclick="document.getElementById('importFileInput').click()">📤 匯入資料</button>
      <input type="file" id="importFileInput" accept=".json" style="display:none" onchange="importData(event)">
    </div>
  `;
  // Append tools after edit area content (if not already there)
  if (!document.getElementById('importFileInput')) {
    area.insertAdjacentHTML('beforeend', toolsHtml);
  }
}

async function exportAllData() {
  try {
    const [itemsSnap, fieldsSnap] = await Promise.all([
      DB.instance.collection(DB.ITEMS).orderBy('name').get(),
      DB.instance.collection(DB.FIELDS).orderBy('name').get()
    ]);
    const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const fields = fieldsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const data = { exportDate: new Date().toISOString(), items, fields };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `庫存管理備份_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus('✓ 匯出成功', 'success');
  } catch (e) {
    console.error('匯出失敗:', e);
    showStatus('✗ 匯出失敗', 'error');
  }
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.items && !data.fields) {
        alert('檔案格式錯誤：找不到 items 或 fields 資料');
        return;
      }
      const db = DB.instance;
      let imported = 0;
      // Import items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const { id, ...itemData } = item;
          if (id) {
            await db.collection(DB.ITEMS).doc(id).set(itemData);
          } else {
            await db.collection(DB.ITEMS).add(itemData);
          }
          imported++;
        }
      }
      // Import fields
      if (data.fields && Array.isArray(data.fields)) {
        for (const field of data.fields) {
          const { id, ...fieldData } = field;
          await db.collection(DB.FIELDS).doc(id || fieldData.name).set(fieldData);
          imported++;
        }
      }
      // Reload
      await loadAllData();
      renderCapsules();
      renderEditArea();
      showStatus(`✓ 匯入完成（${imported} 筆）`, 'success');
    } catch (err) {
      console.error('匯入失敗:', err);
      alert('匯入失敗：' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}
