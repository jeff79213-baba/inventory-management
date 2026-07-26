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
  document.getElementById('editArea').innerHTML = '<div class="empty-state">新增品項（待實作）</div>';
}

function openAddField() {
  document.getElementById('editArea').innerHTML = '<div class="empty-state">新增欄位（待實作）</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
