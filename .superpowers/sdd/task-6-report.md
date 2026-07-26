# Task 6 Report: Settings mode — options CRUD + drag

## Changes Made

**File modified:** `public/js/app.js`

### 1. Modified `renderEditArea()` settings branch (line 64-67)
- Replaced placeholder `<div class="empty-state">後台設定模式（待實作）</div>` with `renderSettingsEdit(area)`

### 2. Added `renderSettingsEdit(area)` (after line 128)
- Renders field name header with save button
- Renders existing options as draggable capsules with edit/delete buttons
- Renders a textarea for adding new options (one per line)
- Calls `setupDragSort()` after rendering

### 3. Added `editOptionText(span, index)` — inline edit
- Replaces option text span with an `<input>`
- Enter confirms, Escape cancels, blur confirms
- Updates `field.options` array in memory and re-renders

### 4. Added `deleteOption(index)` — remove option
- Confirms via `confirm()`, splices from array, re-renders

### 5. Added `addOptions()` — batch add options
- Reads textarea, splits by newlines, trims, pushes to `field.options`

### 6. Added `saveFieldOptions()` — persist to Firestore
- Calls `DB.instance.collection(DB.FIELDS).doc(field.id).update({ options })`
- Shows success/error via `showStatus()`

### 7. Added `setupDragSort()` — drag and drop reorder
- Attaches `dragstart`, `dragend`, `dragover`, `drop` events on each `.option-capsule[draggable]`
- On drop, splices and re-inserts the option at the new index, then re-renders

### Commit
```
git commit -m "feat: settings mode with option CRUD and drag sorting"
```

### Verification
- All existing functions preserved (0 removed, 0 modified except the placeholder)
- Total lines: 128 → 435 (added 6 new functions + the settings render call)
