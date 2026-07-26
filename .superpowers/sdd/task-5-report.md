# Task 5 Report

## Status: DONE

## Changes to `public/js/app.js`

All existing functions preserved. Added these new functions at end of file:

| Function | Line | Purpose |
|----------|------|---------|
| `showStatus(msg, cls)` | 211 | Shows green/red status toast in edit header, auto-removes after 2s |
| `saveItem()` | 226 | Saves current selection's location/qty/note/attributes/selectedFields to Firestore |
| (replaced) `openAddItem()` | 154 | Full new-item form with all field blocks, location/qty/note/photo fields |
| `toggleNewOption(encFid, encVal)` | 251 | Toggles attribute selection in new-item form with visual feedback |
| `handleNewPhoto(e)` | 268 | Reads uploaded photo (max 500KB) as base64 for preview + storage |
| `saveNewItem()` | 281 | Creates new Firestore doc, reloads item list, resets UI to empty state |

Also added globals `_newItemAttrs` and `_newItemPhoto` for new-item form state.

## Commit

`feat: save and add item with all fields selection`
