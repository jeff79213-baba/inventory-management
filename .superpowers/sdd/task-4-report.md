# Task 4 Report

**File modified:** `public/js/app.js`

## Changes

1. **Replaced `renderEditArea()`** — Full inventory edit area rendering:
   - Early returns for no selection / settings mode / missing item
   - Iterates `selectedFields` on the item to build field blocks
   - Each field block renders its `options` as toggleable capsules via `toggleOption()`
   - Edit header with title, save status, and "儲存" button
   - Edit footer with location, photo display, quantity, and note fields

2. **Added `toggleOption()`** — Toggles an option value in `item.attributes[fieldName]`, then calls `renderEditArea()` to refresh UI.

## Verification

- All existing functions (`loadAllData`, `switchMode`, `onSearch`, `renderCapsules`, `selectCapsule`, `openAddNew`, `openAddItem`, `openAddField`, `escapeHtml`) remain unchanged.
- `toggleOption` placed immediately after `renderEditArea`.
