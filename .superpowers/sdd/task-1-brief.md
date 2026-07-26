# Task 1: Firestore 資料結構遷移 + db.js

## Files
- Modify: `public/js/config.js`
- Create: `public/js/db.js`

## What to do

### 1. Create public/js/db.js

```js
const DB = {
  instance: firebase.firestore(),
  FIELDS: 'inv_fields',
  ITEMS: 'inv_items'
};
```

### 2. Create public/js/migrate.js

A one-time migration script that reads from `inv_settings/global` document's `fields` array, and writes each field as a separate document in `inv_fields/{fieldName}`.

```js
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
```

Note: `migrateFields()` uses `db` which comes from firebase. The `db` instance is from `firebase.firestore()`. This script is for manual one-time execution in browser console after deployment.

### 3. No HTML change needed - db.js will be loaded via index.html in Task 2.

### 4. Commit:
```bash
git add public/js/db.js public/js/migrate.js
git commit -m "feat: add db.js with collection refs, add migration script"
```

## Exact values
- Collection name for fields: `inv_fields`
- Collection name for items: `inv_items`
- Migrate FROM: `inv_settings/global`
- Each field document: `{ name: string, options: string[] }`

## Global constraints
- Firestore collection prefix: `inv_`
- This is the first task; later tasks will create the new UI
