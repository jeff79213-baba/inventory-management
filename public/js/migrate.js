async function migrateFields() {
  const doc = await db.doc('inv_settings/global').get();
  if (!doc.exists) return;
  const fields = doc.data().fields || [];
  const batch = db.batch();
  fields.forEach(f => {
    const ref = db.collection(DB.FIELDS).doc(f.name);
    batch.set(ref, { name: f.name, options: f.options || [] });
  });
  await batch.commit();
  console.log(`Migrated ${fields.length} fields`);
}
