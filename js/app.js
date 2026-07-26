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
