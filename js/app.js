// 庫存管理主頁面 JS
const db = firebase.firestore();
const SETTINGS_DOC = 'inv_settings/global';
const ITEMS_COLLECTION = 'inv_items';

let allItems = [];
let fieldsConfig = [];
let currentPhotoBase64 = null;
let deleteTargetId = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadItems();
});

// 載入欄位設定
async function loadSettings() {
  try {
    const doc = await db.doc(SETTINGS_DOC).get();
    if (doc.exists) {
      fieldsConfig = doc.data().fields || [];
    }
  } catch (e) {
    console.error('載入設定失敗:', e);
  }
  updateAttrHeader();
}

// 更新屬性表頭
function updateAttrHeader() {
  const header = document.getElementById('attrHeader');
  if (fieldsConfig.length > 0) {
    header.textContent = fieldsConfig.map(f => f.name).join(' / ');
  } else {
    header.textContent = '屬性';
  }
}

// 載入品項列表
async function loadItems() {
  try {
    const snapshot = await db.collection(ITEMS_COLLECTION)
      .orderBy('name')
      .get();
    allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('載入品項失敗:', e);
    allItems = [];
  }
  renderItems(allItems);
}

// 渲染品項列表
function renderItems(items) {
  const tbody = document.getElementById('itemsList');
  
  if (items.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="empty-state">
        <p>尚無品項</p>
        <p class="help-text">點擊「新增品項」開始建立庫存</p>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = items.map(item => {
    // 照片
    const photoHtml = item.photo 
      ? `<img src="${item.photo}" style="width:50px;height:50px;object-fit:cover;border-radius:4px">`
      : `<div style="width:50px;height:50px;background:#e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px">無照片</div>`;
    
    // 屬性標籤
    const attrHtml = fieldsConfig.length > 0 
      ? fieldsConfig.map(f => {
          const val = item.attributes?.[f.name];
          if (!val) return `<span class="tag">-</span>`;
          if (Array.isArray(val)) {
            return val.map(v => `<span class="tag">${escapeHtml(v)}</span>`).join(' ');
          }
          return `<span class="tag">${escapeHtml(val)}</span>`;
        }).join(' ')
      : '-';

    return `
      <tr>
        <td>${photoHtml}</td>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${attrHtml}</td>
        <td>${item.quantity || 0}</td>
        <td>${escapeHtml(item.location || '-')}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openEditModal('${item.id}')">編輯</button>
          <button class="btn btn-sm btn-danger" onclick="openDeleteModal('${item.id}', '${escapeHtml(item.name)}')">刪除</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 搜尋過濾
function filterItems() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  if (!keyword) {
    renderItems(allItems);
    return;
  }
  const filtered = allItems.filter(item => 
    item.name.toLowerCase().includes(keyword) ||
    (item.location || '').toLowerCase().includes(keyword)
  );
  renderItems(filtered);
}

// 開啟新增模態框
function openAddModal() {
  document.getElementById('modalTitle').textContent = '新增品項';
  document.getElementById('itemId').value = '';
  document.getElementById('itemName').value = '';
  document.getElementById('itemQty').value = '1';
  document.getElementById('itemLocation').value = '';
  resetPhoto();
  renderDynamicFields({});
  document.getElementById('itemModal').classList.add('active');
}

// 開啟編輯模態框
function openEditModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  document.getElementById('modalTitle').textContent = '編輯品項';
  document.getElementById('itemId').value = id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemQty').value = item.quantity || 1;
  document.getElementById('itemLocation').value = item.location || '';
  
  // 照片
  if (item.photo) {
    currentPhotoBase64 = item.photo;
    document.getElementById('photoPreview').src = item.photo;
    document.getElementById('photoPreview').style.display = 'block';
    document.getElementById('photoHint').style.display = 'none';
  } else {
    resetPhoto();
  }
  
  renderDynamicFields(item.attributes || {});
  document.getElementById('itemModal').classList.add('active');
}

// 關閉模態框
function closeModal() {
  document.getElementById('itemModal').classList.remove('active');
}

// 重設照片
function resetPhoto() {
  currentPhotoBase64 = null;
  document.getElementById('photoInput').value = '';
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoHint').style.display = 'block';
}

// 處理照片上傳
function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 限制 500KB
  if (file.size > 500 * 1024) {
    alert('照片大小不能超過 500KB');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    // 壓縮並轉 base64
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 300;
      let width = img.width;
      let height = img.height;
      
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
      
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      
      currentPhotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
      document.getElementById('photoPreview').src = currentPhotoBase64;
      document.getElementById('photoPreview').style.display = 'block';
      document.getElementById('photoHint').style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 渲染動態欄位
function renderDynamicFields(values) {
  const container = document.getElementById('dynamicFieldsContent');
  const wrapper = document.getElementById('dynamicFields');

  if (fieldsConfig.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = 'block';
  
  container.innerHTML = fieldsConfig.map(field => {
    const currentVal = values[field.name];
    
    if (field.type === 'dropdown') {
      const options = (field.options || []).map(opt => 
        `<option value="${escapeHtml(opt)}" ${currentVal === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`
      ).join('');
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.name)}</label>
          <select class="form-select" data-field="${escapeHtml(field.name)}">
            <option value="">-- 請選擇 --</option>
            ${options}
          </select>
        </div>
      `;
    }
    
    if (field.type === 'checkbox') {
      const checked = Array.isArray(currentVal) ? currentVal : [];
      const options = (field.options || []).map(opt => `
        <label class="checkbox-item">
          <input type="checkbox" data-field="${escapeHtml(field.name)}" value="${escapeHtml(opt)}" 
                 ${checked.includes(opt) ? 'checked' : ''}>
          ${escapeHtml(opt)}
        </label>
      `).join('');
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.name)}</label>
          <div class="checkbox-group">${options}</div>
        </div>
      `;
    }
    
    if (field.type === 'text') {
      return `
        <div class="form-group">
          <label class="form-label">${escapeHtml(field.name)}</label>
          <input type="text" class="form-input" data-field="${escapeHtml(field.name)}" 
                 value="${escapeHtml(currentVal || '')}" placeholder="輸入${escapeHtml(field.name)}">
        </div>
      `;
    }
    
    return '';
  }).join('');
}

// 收集動態欄位值
function collectDynamicFields() {
  const attributes = {};
  
  fieldsConfig.forEach(field => {
    if (field.type === 'dropdown') {
      const el = document.querySelector(`select[data-field="${field.name}"]`);
      if (el && el.value) {
        attributes[field.name] = el.value;
      }
    }
    
    if (field.type === 'checkbox') {
      const checked = document.querySelectorAll(`input[data-field="${field.name}"]:checked`);
      if (checked.length > 0) {
        attributes[field.name] = Array.from(checked).map(el => el.value);
      }
    }
    
    if (field.type === 'text') {
      const el = document.querySelector(`input[data-field="${field.name}"]`);
      if (el && el.value) {
        attributes[field.name] = el.value;
      }
    }
  });
  
  return attributes;
}

// 儲存品項
async function saveItem() {
  const id = document.getElementById('itemId').value;
  const name = document.getElementById('itemName').value.trim();
  const qty = parseInt(document.getElementById('itemQty').value) || 0;
  const location = document.getElementById('itemLocation').value.trim();
  const attributes = collectDynamicFields();

  if (!name) {
    alert('請輸入品項名稱');
    return;
  }

  const data = {
    name,
    quantity: qty,
    location,
    attributes,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (currentPhotoBase64) {
    data.photo = currentPhotoBase64;
  }

  try {
    if (id) {
      // 編輯
      await db.collection(ITEMS_COLLECTION).doc(id).update(data);
    } else {
      // 新增
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(ITEMS_COLLECTION).add(data);
    }
    
    closeModal();
    await loadItems();
  } catch (e) {
    console.error('儲存失敗:', e);
    alert('儲存失敗，請稍後再試');
  }
}

// 開啟刪除確認
function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('deleteItemName').textContent = name;
  document.getElementById('deleteModal').classList.add('active');
}

// 關閉刪除確認
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('deleteModal').classList.remove('active');
}

// 確認刪除
async function confirmDelete() {
  if (!deleteTargetId) return;

  try {
    await db.collection(ITEMS_COLLECTION).doc(deleteTargetId).delete();
    closeDeleteModal();
    await loadItems();
  } catch (e) {
    console.error('刪除失敗:', e);
    alert('刪除失敗，請稍後再試');
  }
}

// HTML轉義
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
