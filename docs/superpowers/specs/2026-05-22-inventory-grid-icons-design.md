# Inventory Grid/List Toggle — Design Spec
_Date: 2026-05-22_

## Overview

Add a grid/list toggle to the Inventory screen. Grid mode shows a dense icon grid (WoW-style) for experienced players who know the icons. List mode keeps the existing row layout unchanged. Detail content adapts by viewport: inline accordion on portrait/narrow, side panel on landscape/wide.

---

## Toggle

- A grid/list icon button sits in the filter bar, to the right of the All/Resources/Tools/Items tabs.
- Default: list mode (preserves existing experience on first visit).
- Preference stored in `localStorage` key `hearth.settings.inventoryView` (`"grid"` | `"list"`).

---

## Grid Mode

- Cells: ~80–90px wide, square, `auto-fill` CSS grid (`minmax(84px, 1fr)`), gap 8px.
- Each cell contains:
  - Centered resource icon (existing `Icon` component, ~52px)
  - Top-right quantity badge: small pill showing count (e.g. `12`), hidden if count is 0
  - No label text — icon only
- Selected cell gets the existing green border/glow selection style.
- Muted styling (opacity) for items with count 0, same as current list.

---

## List Mode

Existing layout — no changes. `BrowserItemButton` rows with icon, label, subtitle, count, status badges.

---

## Detail Behavior

### Landscape / wide (> 720px)

- Right-side detail panel always present when an item is selected — existing `BrowserDetail` behavior, unchanged.
- Both grid and list modes use this layout.

### Portrait / narrow (≤ 720px)

- No side panel.
- Clicking an item opens an **inline accordion** that slides open beneath the grid/list row containing the selected cell.
- The accordion has:
  - A small upward-pointing CSS triangle arrow, horizontally aligned to the center of the selected cell.
  - Full detail pane contents (same component as the landscape side panel).
  - A close (×) button in the top-right corner of the accordion panel.
- Clicking the same item again, clicking the close button, or selecting a different item collapses the current accordion first (slide out), then opens the new one (slide in) if a different item was tapped.
- Animation: CSS `max-height` transition, ~200ms ease-out open, ~150ms ease-in close.

---

## Files Affected

| File | Change |
|---|---|
| `src/features/inventory/index.jsx` | Add toggle button, view mode state, accordion logic |
| `src/ui/Inventory.jsx` | Add `InventoryIconGrid` component (grid cell + badge), accordion slot |
| `src/ui/primitives/BrowserDetail.jsx` | No change (detail component reused as-is) |
| `src/components.css` | Add `.inv-grid`, `.inv-grid__cell`, `.inv-grid__badge`, `.inv-accordion` styles |

---

## Out of Scope

- Drag-to-reorder cells
- Per-category grid density settings
- Any changes to the detail pane contents
- Fish/Harbor or Mine-specific overrides
