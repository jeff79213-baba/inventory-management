# Task 7 Report: Settings Mode — Add New Field

## Status: DONE

### Changes made to `public/js/app.js`

1. **Replaced `openAddField()`** (line 324) — placeholder form replaced with full form including:
   - Text input for field name (`#newFieldName`)
   - Textarea for options (`#newFieldOptions`)
   - Save button calling `saveNewField()`

2. **Added `saveNewField()`** (line 338) — async function that:
   - Validates field name input
   - Parses options from textarea (one per line)
   - Saves to Firestore via `DB.instance.collection(DB.FIELDS).doc(name).set()`
   - Reloads all fields, sets current selection to the new field
   - Re-renders capsules and edit area
   - Shows success/error status

### Commit
`e890f24` — `feat: add new field in settings mode`
