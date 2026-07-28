async function exportBackup() {
  try {
    const [itemsSnap, fieldsSnap, unitsSnap] = await Promise.all([
      DB.instance.collection(DB.ITEMS).get(),
      DB.instance.collection(DB.FIELDS).get(),
      DB.instance.collection(DB.UNITS).get()
    ]);
    const serialize = snap => snap.docs.map(d => {
      const obj = { id: d.id, ...d.data() };
      if (obj.createdAt && typeof obj.createdAt.toDate === 'function') {
        obj.createdAt = obj.createdAt.toDate().toISOString();
      }
      return obj;
    });
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        items: serialize(itemsSnap),
        fields: serialize(fieldsSnap),
        units: serialize(unitsSnap)
      }
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `库存备份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('✓ 匯出成功', 'success');
  } catch (e) {
    console.error('匯出失敗:', e);
    showStatus('✗ 匯出失敗', 'error');
  }
}

function triggerImport() {
  document.getElementById('importFileInput').click();
}

async function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (!backup.version || !backup.data ||
        !Array.isArray(backup.data.items) ||
        !Array.isArray(backup.data.fields) ||
        !Array.isArray(backup.data.units)) {
      showStatus('✗ 檔案格式錯誤', 'error');
      return;
    }
    if (!confirm('⚠️ 此操作將清除所有現有資料，是否確定還原？')) return;
    const db = DB.instance;
    await db.collection(DB.ITEMS).get().then(s => Promise.all(s.docs.map(d => d.ref.delete())));
    await db.collection(DB.FIELDS).get().then(s => Promise.all(s.docs.map(d => d.ref.delete())));
    await db.collection(DB.UNITS).get().then(s => Promise.all(s.docs.map(d => d.ref.delete())));
    for (const item of backup.data.items) {
      const { id, createdAt, ...rest } = item;
      await db.collection(DB.ITEMS).doc(id).set({
        ...rest, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    for (const field of backup.data.fields) {
      const { id, createdAt, ...rest } = field;
      await db.collection(DB.FIELDS).doc(id).set({
        ...rest, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    for (const unit of backup.data.units) {
      const { id, createdAt, ...rest } = unit;
      await db.collection(DB.UNITS).doc(id).set({
        ...rest, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    await loadAllData();
    renderCapsules();
    if (currentMode === 'inventory') renderTable();
    renderFieldList(document.getElementById('settingsArea'));
    showStatus('✓ 匯入成功', 'success');
  } catch (e) {
    console.error('匯入失敗:', e);
    showStatus('✗ 匯入失敗', 'error');
  }
  e.target.value = '';
}
