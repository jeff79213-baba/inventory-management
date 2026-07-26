# Task 3 Report: Core JS — 模式切換 + 資料載入

## Status: DONE

### Changes made
- **Replaced** `public/js/app.js` — old table-based code removed, new capsule-based SPA core written from scratch

### What was implemented
| Requirement | Implementation |
|---|---|
| Global state vars | `currentMode`, `currentSelection`, `allItems`, `allFields` |
| Data loading | `loadAllData()` uses `DB.instance` with `DB.ITEMS`/`DB.FIELDS`, `Promise.all` for parallel fetch |
| Mode switching | `switchMode(mode)` toggles active class, clears selection/search, updates placeholder |
| Search filtering | `onSearch(query)` → `renderCapsules(query)` — full JSON string match |
| Capsule rendering | `renderCapsules()` renders filtered items/fields as `.capsule` divs + `+` add button |
| Capsule selection | `selectCapsule()` with `encodeURIComponent`/`decodeURIComponent` for safe IDs |
| Edit area | `renderEditArea()` placeholder (Tasks 4-7) |
| Add new | `openAddNew()` → `openAddItem()` / `openAddField()` placeholders |
| XSS safety | `escapeHtml()` for all user-generated content display |

### Commit
- `80b1a2c` — `feat: core app with mode switching and capsule rendering`
