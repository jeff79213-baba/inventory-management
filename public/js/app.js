let currentMode = 'inventory';
let currentSelection = null;
let allFields = [];
let allItems = [];
let allUnits = [];
let selectedItemName = null;
let selectedAttrs = {};
let selectedPhoto = null;
let editingUnitId = null;
let settingsSelectedItem = null;
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
  selectedPhoto = null;
  editingUnitId = null;
  settingsSelectedItem = null;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.getElementById('searchInput').value = '';
  document.getElementById('searchInput').placeholder = mode === 'inventory'
    ? '搜尋品項名稱、特徵、備註...'
    : '搜尋欄位名稱...';
  document.getElementById('fieldSelectArea').style.display = 'none';
  document.getElementById('inputArea').style.display = 'none';
  document.getElementById('tableArea').style.display = 'none';
  document.getElementById('settingsArea').innerHTML = '';
  renderCapsules();
  if (mode === 'inventory') renderTable();
  if (mode === 'settings') renderSettingsPanel();
}

function onSearch(query) {
  renderCapsules(query);
  if (currentMode === 'inventory') renderTable(query);
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
  const header = document.querySelector('.edit-header') || document.querySelector('.field-list') || document.querySelector('.navbar');
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
  const allCapsule = `<div class="capsule ${!selectedItemName ? 'active' : ''}" onclick="selectAllItems()" title="顯示全部資料">全部顯示</div>`;
  area.innerHTML = allCapsule + filtered.map(item => `
    <div class="capsule ${selectedItemName === item.name ? 'active' : ''}"
         onclick="selectItemName('${escapeHtml(item.name)}')">
      ${escapeHtml(item.name)}
    </div>
  `).join('') + `<button class="capsule-add" onclick="openAddItemName()">+</button>`;
}

function selectAllItems() {
  selectedItemName = null;
  selectedAttrs = {};
  document.getElementById('fieldSelectArea').style.display = 'none';
  document.getElementById('inputArea').style.display = 'none';
  document.getElementById('inputArea').innerHTML = '';
  renderCapsules(document.getElementById('searchInput').value);
  renderTable();
}

function selectItemName(name) {
  if (selectedItemName === name) {
    const fieldArea = document.getElementById('fieldSelectArea');
    if (fieldArea.style.display !== 'none') {
      fieldArea.style.display = 'none';
      document.getElementById('inputArea').style.display = 'none';
      document.getElementById('inputArea').innerHTML = '';
    } else {
      selectedAttrs = {};
      renderFieldSelectArea();
    }
  } else {
    selectedItemName = name;
    selectedAttrs = {};
    renderFieldSelectArea();
  }
  renderCapsules(document.getElementById('searchInput').value);
  renderTable();
}

function renderFieldSelectArea() {
  const area = document.getElementById('fieldSelectArea');
  const item = allItems.find(i => i.name === selectedItemName);
  const assignedIds = (item && item.fieldIds) || [];
  const visibleFields = allFields.filter(f => f.showInList && (assignedIds.length === 0 || assignedIds.includes(f.id)));
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

  const isEditing = !!editingUnitId;
  const saveBtnLabel = isEditing ? '更新單位' : '儲存單位';
  area.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-weight:600;font-size:1rem">${escapeHtml(selectedItemName)}</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="saveUnit()">${saveBtnLabel}</button>
        ${isEditing ? '<button class="btn btn-outline btn-sm" onclick="cancelEdit()">取消</button>' : ''}
      </div>
    </div>
    <div style="display:flex;gap:0;flex-wrap:wrap;align-items:flex-start">${fieldRows}</div>
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
    <div class="form-group">
      <label class="form-label">照片</label>
      <input type="file" accept="image/*" onchange="handlePhotoSelect(event)" style="font-size:0.85rem">
      <div id="photoPreview" style="margin-top:6px"></div>
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

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) { selectedPhoto = null; document.getElementById('photoPreview').innerHTML = ''; return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      const maxW = 1600, maxH = 1600;
      let w = img.width, h = img.height;
      if (w > maxW) { h = h * maxW / w; w = maxW; }
      if (h > maxH) { w = w * maxH / h; h = maxH; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      selectedPhoto = c.toDataURL('image/jpeg', 0.95);
      document.getElementById('photoPreview').innerHTML = `<img src="${selectedPhoto}" style="max-width:150px;max-height:150px;border-radius:6px;border:1px solid #ddd">`;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function showPhoto(unitId) {
  const unit = allUnits.find(u => u.id === unitId);
  if (!unit || !unit.photo) return;
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  const img = document.createElement('img');
  img.src = unit.photo;
  img.className = 'photo-full';
  let scale = 1;
  function zoom(d) { scale = Math.max(0.5, Math.min(5, scale + d)); img.style.transform = `scale(${scale})`; }
  overlay.onwheel = (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? -0.2 : 0.2); };
  const controls = document.createElement('div');
  controls.className = 'photo-controls';
  const zoomIn = document.createElement('button'); zoomIn.className = 'photo-btn'; zoomIn.textContent = '+';
  zoomIn.onclick = (e) => { e.stopPropagation(); zoom(0.5); };
  const zoomOut = document.createElement('button'); zoomOut.className = 'photo-btn'; zoomOut.textContent = '−';
  zoomOut.onclick = (e) => { e.stopPropagation(); zoom(-0.5); };
  const closeBtn = document.createElement('button'); closeBtn.className = 'photo-btn photo-close'; closeBtn.textContent = '✕';
  closeBtn.onclick = (e) => { e.stopPropagation(); overlay.remove(); };
  controls.append(zoomOut, zoomIn, closeBtn);
  overlay.append(img, controls);
  document.body.appendChild(overlay);
}

function cancelEdit() {
  editingUnitId = null;
  selectedPhoto = null;
  selectedAttrs = {};
  renderFieldSelectArea();
  document.getElementById('inputArea').innerHTML = '';
  document.getElementById('inputArea').style.display = 'none';
}

function fieldsEqual(a, b) {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return false;
    if (JSON.stringify(a[ka[i]]) !== JSON.stringify(b[ka[i]])) return false;
  }
  return true;
}

function findDuplicateUnit(itemName, fields, excludeId) {
  return allUnits.find(u => u.itemName === itemName && fieldsEqual(u.fields, fields) && u.id !== excludeId) || null;
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
    const data = { itemName: selectedItemName, fields, quantity, location, note };
    if (selectedPhoto) data.photo = selectedPhoto;
    if (editingUnitId) {
      await DB.instance.collection(DB.UNITS).doc(editingUnitId).update(data);
      editingUnitId = null;
    } else {
      const dup = findDuplicateUnit(selectedItemName, fields, null);
      if (dup) {
        const msg = `已有相同內容的資料（位置：${dup.location || '未填'}），是否要累加數量？\n（目前數量：${dup.quantity}，新數量：${quantity}，合計：${dup.quantity + quantity}）`;
        if (confirm(msg)) {
          await DB.instance.collection(DB.UNITS).doc(dup.id).update({
            quantity: dup.quantity + quantity,
            location: location || dup.location,
            note: note || dup.note
          });
          if (selectedPhoto) await DB.instance.collection(DB.UNITS).doc(dup.id).update({ photo: selectedPhoto });
        } else {
          data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await DB.instance.collection(DB.UNITS).add(data);
        }
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await DB.instance.collection(DB.UNITS).add(data);
      }
    }
    selectedAttrs = {};
    selectedPhoto = null;
    await loadAllData();
    renderFieldSelectArea();
    renderTable();
    showStatus('✓ 儲存成功', 'success');
  } catch (e) {
    console.error('儲存失敗:', e);
    showStatus('✗ 儲存失敗', 'error');
  }
}

function renderTable(searchQuery) {
  if (currentMode !== 'inventory') return;
  const area = document.getElementById('tableArea');
  const visibleFields = allFields.filter(f => f.showInList);
  let filteredUnits = selectedItemName ? allUnits.filter(u => u.itemName === selectedItemName) : allUnits;
  const q = (searchQuery || '').toLowerCase().trim();
  if (q) {
    filteredUnits = filteredUnits.filter(u => {
      if ((u.itemName || '').toLowerCase().includes(q)) return true;
      if (u.fields) {
        for (const vals of Object.values(u.fields)) {
          if (vals.some(v => v.toLowerCase().includes(q))) return true;
        }
      }
      if ((u.location || '').toLowerCase().includes(q)) return true;
      if ((u.note || '').toLowerCase().includes(q)) return true;
      if (String(u.quantity || 0).includes(q)) return true;
      return false;
    });
  }
  const itemForFilter = selectedItemName ? allItems.find(i => i.name === selectedItemName) : null;
  const assignedIds = (itemForFilter && itemForFilter.fieldIds) || [];
  const tableFields = visibleFields.filter(f => assignedIds.length === 0 || assignedIds.includes(f.id));
  if (filteredUnits.length === 0) {
    area.innerHTML = `<div class="empty-state">${selectedItemName ? `「${escapeHtml(selectedItemName)}」尚無資料` : '尚無存入資料'}</div>`;
    area.style.display = 'block';
    return;
  }
  const hasPhoto = filteredUnits.some(u => u.photo);
  const headers = tableFields.map(f => `<th>${escapeHtml(f.name)}</th>`).join('');
  const photoTh = hasPhoto ? '<th>照片</th>' : '';
  const rows = filteredUnits.map(unit => {
    const cells = tableFields.map(f => {
      const vals = (unit.fields && unit.fields[f.name]) || [];
      return `<td>${escapeHtml(vals.join(', '))}</td>`;
    }).join('');
    const photoTd = hasPhoto ? `<td>${unit.photo ? `<img src="${unit.photo}" class="table-photo" onclick="showPhoto('${unit.id}')">` : ''}</td>` : '';
    return `<tr>
      <td>${escapeHtml(unit.itemName)}</td>
      ${cells}
      ${photoTd}
      <td>${unit.quantity || 0}</td>
      <td>${escapeHtml(unit.location || '')}</td>
      <td>${escapeHtml(unit.note || '')}</td>
      <td class="col-actions">
        <button class="btn-icon" onclick="editUnit('${unit.id}')" title="編輯">✏️</button>
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
          ${photoTh}
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

function editUnit(id) {
  const unit = allUnits.find(u => u.id === id);
  if (!unit) return;
  cancelEdit();
  editingUnitId = id;
  selectedItemName = unit.itemName;
  selectedAttrs = {};
  const item = allItems.find(i => i.name === unit.itemName);
  const assignedIds = (item && item.fieldIds) || [];
  const visibleFields = allFields.filter(f => f.showInList && (assignedIds.length === 0 || assignedIds.includes(f.id)));
  for (const f of visibleFields) {
    const vals = (unit.fields && unit.fields[f.name]) || [];
    if (vals.length > 0) selectedAttrs[f.id] = vals;
  }
  selectedPhoto = unit.photo || null;
  renderCapsules(document.getElementById('searchInput').value);
  renderFieldSelectArea();
  const qtyInput = document.getElementById('unitQty');
  if (qtyInput) qtyInput.value = unit.quantity || 0;
  const locInput = document.getElementById('unitLocation');
  if (locInput) locInput.value = unit.location || '';
  const noteInput = document.getElementById('unitNote');
  if (noteInput) noteInput.value = unit.note || '';
  if (unit.photo) {
    document.getElementById('photoPreview').innerHTML = `<img src="${unit.photo}" style="max-width:150px;max-height:150px;border-radius:6px;border:1px solid #ddd">`;
  }
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

function showInlineInput(container, placeholder, onSave, selector) {
  const addBtn = container.querySelector(selector || '.capsule-add');
  if (!addBtn) return;
  const origClass = addBtn.className;
  const input = document.createElement('input');
  input.className = 'capsule-input';
  input.placeholder = placeholder;
  addBtn.replaceWith(input);
  input.focus();
  const finish = async () => {
    const val = input.value.trim();
    if (val) {
      input.disabled = true;
      await onSave(val);
    }
    const newBtn = document.createElement('button');
    newBtn.className = origClass;
    newBtn.textContent = '+';
    newBtn.onclick = () => showInlineInput(container, placeholder, onSave, selector);
    input.replaceWith(newBtn);
  };
  input.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(); }
    if (e.key === 'Escape') { input.value = ''; finish(); }
  };
  input.onblur = finish;
}

function openAddItemName() {
  const sel = currentMode === 'settings' ? '.capsule-add-items' : '.capsule-add';
  showInlineInput(document.getElementById('capsuleArea'), '輸入品項名稱', async (name) => {
    try {
      await DB.instance.collection(DB.ITEMS).doc(name).set({
        name, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await loadAllData();
      renderCapsules(document.getElementById('searchInput').value);
      showStatus('✓ 品項已新增', 'success');
    } catch (e) {
      console.error('新增品項失敗:', e);
      showStatus('✗ 新增失敗', 'error');
    }
  }, sel);
}

/* ============================================================
   SETTINGS MODE
   ============================================================ */

function renderSettingsCapsules(area, query) {
  const q = (query || '').toLowerCase();
  const filteredItems = q ? allItems.filter(i => i.name.toLowerCase().includes(q)) : allItems;
  const filteredFields = q ? allFields.filter(f => f.name.toLowerCase().includes(q)) : allFields;
  const itemCaps = filteredItems.map(item => `
    <div class="capsule ${settingsSelectedItem === item.id ? 'active' : ''}"
         onclick="selectSettingsItem('${encodeURIComponent(item.id)}')">
      ${escapeHtml(item.name)}
    </div>
  `).join('');
  const fieldCaps = filteredFields.map(f => `
    <div class="capsule ${currentSelection === f.id ? 'active' : ''}"
         onclick="selectField('${encodeURIComponent(f.id)}')">
      ${escapeHtml(f.name)}
    </div>
  `).join('');
  area.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:4px;width:100%">
      <span style="font-size:0.8rem;color:var(--gray-500);font-weight:600;margin-right:4px">品項</span>
      ${itemCaps}
      <button class="capsule-add capsule-add-items" onclick="openAddItemName()">+</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;width:100%">
      <span style="font-size:0.8rem;color:var(--gray-500);font-weight:600;margin-right:4px">欄位</span>
      ${fieldCaps}
      <button class="capsule-add capsule-add-fields" onclick="openAddField()">+</button>
    </div>
  `;
}

function selectSettingsItem(encodedId) {
  const id = decodeURIComponent(encodedId);
  settingsSelectedItem = settingsSelectedItem === id ? null : id;
  currentSelection = null;
  renderSettingsCapsules(document.getElementById('capsuleArea'), document.getElementById('searchInput').value);
  renderSettingsPanel();
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

  if (settingsSelectedItem) {
    renderItemFieldPanel(area);
    return;
  }
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
          <label class="form-label">新增選項（用 - 分隔，Enter 加入）</label>
          <input type="text" id="newOptionsText" class="form-input" placeholder="選項A-選項B-選項C" onkeydown="if(event.key==='Enter'){event.preventDefault();addOptions()}">
        </div>
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
      <div style="font-weight:600;font-size:1rem;margin-bottom:12px">欄位設定</div>
      <div id="fieldListContainer">${items}</div>
    </div>
    <div class="field-list">
      <div style="font-weight:600;font-size:1rem;margin-bottom:12px">資料管理</div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="exportBackup()">⬇ 匯出備份</button>
        <button class="btn btn-outline btn-sm" onclick="triggerImport()">⬆ 匯入還原</button>
      </div>
      <input type="file" id="importFileInput" accept=".json" style="display:none" onchange="handleImportFile(event)">
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
    if (currentSelection === id) { currentSelection = null; }
    renderSettingsCapsules(document.getElementById('capsuleArea'), document.getElementById('searchInput').value);
    renderFieldList(document.getElementById('settingsArea'));
    showStatus('✓ 已刪除', 'success');
  } catch (e) {
    console.error('刪除失敗:', e);
    showStatus('✗ 刪除失敗', 'error');
  }
}

function openAddField() {
  showInlineInput(document.getElementById('capsuleArea'), '輸入欄位名稱', async (name) => {
    const maxOrder = allFields.reduce((max, f) => Math.max(max, f.order || 0), -1);
    try {
      await DB.instance.collection(DB.FIELDS).doc(name).set({
        name, options: [], order: maxOrder + 1, showInList: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await loadAllData();
      renderSettingsCapsules(document.getElementById('capsuleArea'), document.getElementById('searchInput').value);
      renderSettingsPanel();
      showStatus('✓ 欄位已新增', 'success');
    } catch (e) {
      console.error('新增欄位失敗:', e);
      showStatus('✗ 新增失敗', 'error');
    }
  }, '.capsule-add-fields');
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

function renderItemFieldPanel(area) {
  const item = allItems.find(i => i.id === settingsSelectedItem);
  if (!item) return;
  const assigned = item.fieldIds || [];
  const fieldChecks = allFields.map(f => `
    <label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--gray-200);border-radius:var(--radius);cursor:pointer;margin:4px">
      <input type="checkbox" ${assigned.includes(f.id) ? 'checked' : ''} onchange="toggleItemField('${encodeURIComponent(item.id)}','${encodeURIComponent(f.id)}',this.checked)">
      ${escapeHtml(f.name)}
    </label>
  `).join('');
  area.innerHTML = `
    <div class="field-list">
      <div style="font-weight:600;font-size:1rem;margin-bottom:12px">${escapeHtml(item.name)} — 適用欄位</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${fieldChecks}</div>
      <div style="margin-top:12px;font-size:0.85rem;color:var(--gray-500)">勾選的欄位會在庫存列表中顯示（未設定的品項顯示全部欄位）</div>
    </div>
  `;
}

async function toggleItemField(encodedItemId, encodedFieldId, checked) {
  const itemId = decodeURIComponent(encodedItemId);
  const fieldId = decodeURIComponent(encodedFieldId);
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;
  if (!item.fieldIds) item.fieldIds = [];
  if (checked) {
    if (!item.fieldIds.includes(fieldId)) item.fieldIds.push(fieldId);
  } else {
    item.fieldIds = item.fieldIds.filter(id => id !== fieldId);
  }
  try {
    await DB.instance.collection(DB.ITEMS).doc(itemId).update({ fieldIds: item.fieldIds });
  } catch (e) {
    console.error('更新失敗:', e);
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
