# Task 2: Single Page HTML + CSS

## Files
- Rewrite: `public/index.html`
- Rewrite: `public/css/styles.css`
- Delete: `public/settings.html`

## What to do

### 1. Rewrite public/index.html

Replace the entire file with this structure:

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>庫存管理系統</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <!-- 頂部導航 -->
  <nav class="navbar">
    <a href="#" class="navbar-brand">庫存管理系統</a>
    <div class="mode-toggle">
      <button class="mode-btn active" data-mode="inventory" onclick="switchMode('inventory')">庫存列表</button>
      <button class="mode-btn" data-mode="settings" onclick="switchMode('settings')">後台設定</button>
    </div>
  </nav>

  <div class="container">
    <!-- 第一層：搜尋列 -->
    <div class="search-bar">
      <input type="text" id="searchInput" class="form-input" placeholder="搜尋..."
             oninput="onSearch(this.value)">
    </div>

    <!-- 第二層：名稱膠囊區 -->
    <div id="capsuleArea" class="capsule-area">
      <!-- 動態產生 -->
    </div>

    <!-- 第三層：編輯區 -->
    <div id="editArea" class="edit-area">
      <div class="empty-state">請選擇上方品項</div>
    </div>
  </div>

  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>
  <script src="js/config.js"></script>
  <script src="js/db.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

Note: Script order matters. Firebase compat SDK first, then config.js, then db.js, then app.js.

### 2. Rewrite public/css/styles.css

Replace with the full stylesheet for the new design:

CSS requirements:
- Root variables: --primary (#2563eb), --danger (#dc2626), --success (#16a34a), grays (100-900), --radius (8px), --capsule-bg, --capsule-active, --capsule-active-text
- Navbar: flex, space-between, white bg, bottom border
- Mode toggle: flex row, .mode-btn with .mode-btn.active (blue bg)
- Search bar: full width input
- Capsule area: flex-wrap, gap 8px, white bg, rounded
- Capsule: inline-flex, rounded-20px, hover effect, .capsule.active (blue bg)
- Capsule-add: circular blue + button
- Edit area: white card
- Edit header: flex, space-between, bottom border
- Field grid: flex-wrap, gap 16px
- Field block: min-width 180px, gray-100 bg, rounded, padding
- Field options: flex-wrap, option-capsule with .active state
- Edit footer: flex-wrap, form groups inline
- Photo block: centered, max-width 120px
- Save status: colored text
- Settings-specific: .capsule-tools, .drag-handle
- RWD @media (max-width: 768px): stack navbar, full-width field blocks
- All form inputs/shared styles same as before

See the full CSS code in the plan file at `docs/superpowers/plans/2026-07-26-inventory-redesign.md` in Task 2 section.

### 3. Delete public/settings.html

Remove it with `git rm`.

### 4. Don't modify any JS files yet. Just HTML and CSS.

### 5. Commit:
```bash
git rm public/settings.html
git add public/index.html public/css/styles.css
git commit -m "feat: single-page layout with dual-mode and three-layer structure"
```

## Global constraints
- Single page `index.html`, no `settings.html`
- Touch-friendly, responsive
- Script order: Firebase compat → config.js → db.js → app.js
