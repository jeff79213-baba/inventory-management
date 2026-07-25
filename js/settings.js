// 後台設定頁面 JS
const db = firebase.firestore();
const SETTINGS_DOC = 'inv_settings/global';

let fieldsData = [];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadFields();
});

// 載入欄位設定
async function loadFields() {
  try {
    const doc = await db.doc(SETTINGS_DOC).get();
    if (doc.exists) {
      fieldsData = doc.data().fields || [];
    }
  } catch (e) {
    console.error('載入欄位設定失敗:', e);
  }
  renderFields();
}

// 渲染欄位列表
function renderFields() {
  const container = document.getElementById('fieldsList');
  
  if (fieldsData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>尚未設定任何欄位</p>
        <p class="help-text">點擊上方「新增欄位」開始設定品項屬性</p>
      </div>
    `;
    return;
  }

  container.innerHTML = fieldsData.map((field, index) => `
    <div class="field-item" data-index="${index}">
      <div class="field-header">
        <span class="field-number">${index + 1}</span>
        <div class="field-actions">
          ${index > 0 ? `<button class="btn btn-sm btn-outline" onclick="moveField(${index}, -1)">↑</button>` : ''}
          ${index < fieldsData.length - 1 ? `<button class="btn btn-sm btn-outline" onclick="moveField(${index}, 1)">↓</button>` : ''}
          <button class="btn btn-sm btn-danger" onclick="removeField(${index})">刪除</button>
        </div>
      </div>
      <div class="field-body">
        <div class="form-row">
          <div class="form-group flex-2">
            <label class="form-label">欄位名稱</label>
            <input type="text" class="form-input" value="${escapeHtml(field.name)}" 
                   onchange="updateField(${index}, 'name', this.value)"
                   placeholder="例如：顏色、尺寸、材質">
          </div>
          <div class="form-group flex-1">
            <label class="form-label">欄位類型</label>
            <select class="form-select" onchange="updateField(${index}, 'type', this.value)">
              <option value="dropdown" ${field.type === 'dropdown' ? 'selected' : ''}>下拉選單（單選）</option>
              <option value="checkbox" ${field.type === 'checkbox' ? 'selected' : ''}>多選勾選</option>
              <option value="text" ${field.type === 'text' ? 'selected' : ''}>文字輸入</option>
            </select>
          </div>
        </div>
        
        ${field.type !== 'text' ? `
          <div class="form-group">
            <label class="form-label">選項（每行一個）</label>
            <textarea class="form-textarea" rows="3"
                      onchange="updateFieldOptions(${index}, this.value)"
                      placeholder="選項1&#10;選項2&#10;選項3">${(field.options || []).join('\n')}</textarea>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// 新增欄位
function addField() {
  fieldsData.push({
    name: '',
    type: 'dropdown',
    options: []
  });
  renderFields();
}

// 更新欄位
function updateField(index, key, value) {
  fieldsData[index][key] = value;
  renderFields();
}

// 更新欄位選項
function updateFieldOptions(index, text) {
  fieldsData[index].options = text.split('\n').map(s => s.trim()).filter(s => s);
}

// 刪除欄位
function removeField(index) {
  if (confirm('確定刪除此欄位？')) {
    fieldsData.splice(index, 1);
    renderFields();
  }
}

// 移動欄位
function moveField(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= fieldsData.length) return;
  
  const temp = fieldsData[index];
  fieldsData[index] = fieldsData[newIndex];
  fieldsData[newIndex] = temp;
  renderFields();
}

// 儲存設定
async function saveFields() {
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = '儲存中...';
  statusEl.className = 'save-status saving';

  try {
    await db.doc(SETTINGS_DOC).set({
      fields: fieldsData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    statusEl.textContent = '✓ 儲存成功';
    statusEl.className = 'save-status success';
  } catch (e) {
    console.error('儲存失敗:', e);
    statusEl.textContent = '✗ 儲存失敗';
    statusEl.className = 'save-status error';
  }

  setTimeout(() => {
    statusEl.textContent = '';
    statusEl.className = 'save-status';
  }, 3000);
}

// HTML轉義
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
