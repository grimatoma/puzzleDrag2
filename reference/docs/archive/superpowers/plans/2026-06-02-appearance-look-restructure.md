# Appearance `look` Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the scattered visual/appearance fields on game entities (colors, icons, animations) into a single nested `look` sub-object per entity, and teach the Dev Panel Wiki to render nested object fields as labeled sub-groups — so the wiki field reference reads as organized groups instead of a flat dump.

**Architecture:** Each entity's appearance fields move from flat top-level keys (`color`, `dark`, `iconKey`, `anim`, `ms`, `sway` on items; `bg`/`fill`/`accent`/`iconKey` on seasons; `color` on buildings/NPCs; `icon` on biomes/keepers; `iconKey`/`color` on workers; `iconKey` on abilities) into a nested `look: { … }` object. The Zod schemas become the single source of truth (per the `.meta`/source-of-truth decision); a small `describeSchema` enhancement makes the wiki recurse one level into object fields so `look` renders as a sub-group. We migrate **one entity type at a time**, each as its own commit, updating the schema → the authored data in `constants.ts` → every reader (from the exact site list in the audit) → overrides → tests, before moving on. **No name-global find/replace** — the names `color`/`icon`/`accent`/`fill` are overloaded with unrelated objects (story-editor trigger styles, villager hair, map regions, board stages) that must NOT be touched.

**Tech Stack:** TypeScript, Zod 4, React, Phaser 3, Vitest, Playwright (visual goldens).

---

## Non-goals / explicitly out of scope (do NOT rewrite these)

These share a field *name* with appearance fields but are unrelated objects. Touching them is a regression:

- `npc.color` reads are IN scope (NPC entity). But story-editor `speakerInfo?.color`, `g.color` (group header), `al.color` (alignment label), `p.color` (villager/patron), villager `v.hairColor` — **out of scope** (not entity-config appearance; many are runtime/derived).
  - *Exception:* NPC color reads that resolve `NPCS_BY_KEY[key].color` ARE the NPC entity — in scope (Phase 5).
- `r.fill` in `cartography/MapScene.ts` (region), `stage.accent` in `puzzleBoard.tsx` (board stage), `t.accent`/`s.accent` in cartography (territory/seal), `biome.palette.accent` in `GameScene.ts` (runtime palette) — **out of scope**.
- Story-editor `ts.icon`, `ef.icon`, `tone.icon`, `c.icon`, trigger `icon` — **out of scope** (story trigger/effect glyphs).
- `SCENE_THEMES.bg` (CSS gradient string) — **out of scope**.
- `ACHIEVEMENTS[].icon` and `HAZARDS[].icon` — **DEFERRED** (see "Deferred" at the end). They are appearance-bearing but lack Zod schemas and tangle with many runtime reads; confirm with maintainer before including.

## Save compatibility

`SAVE_SCHEMA_VERSION` (`src/constants.ts:244`, currently `42`) does **not** need a bump: appearance fields live on the `ITEMS`/`SEASONS`/`BUILDINGS`/etc. **config** maps, which are never serialized into `localStorage["hearth.save.v1"]` (saves hold inventory counts, `resourceProgress`, board tile *keys*, and run state — not item config). **Verify** with a grep in Task 0.2; only bump if a persisted structure is found to embed a copied `color`/`anim`/etc.

---

## Task 0: Foundation — verify assumptions & lock the canonical shape

**Files:**
- Read: `src/state/persistence.ts`, `src/state.ts` (serialize path)
- Read: `src/config/schemas/shared.ts`

- [ ] **Step 0.1: Confirm the audit site list is current**

Run, and reconcile counts against the audit (line numbers may have drifted):

```bash
git grep -n "\.color\b" -- 'src/**/*.ts' 'src/**/*.tsx' | wc -l
git grep -n "\.dark\b\|\.iconKey\b\|\.anim\b\|\.sway\b" -- 'src/**/*.ts' 'src/**/*.tsx' | wc -l
```

Expected: nonzero; spot-check a few against the per-field lists in later tasks.

- [ ] **Step 0.2: Confirm appearance is not persisted**

Run:

```bash
git grep -n "color\|iconKey\|anim\|\.dark\|accent\|\.bg\b\|\.fill\b" -- src/state/persistence.ts src/state/serialize.ts 2>/dev/null
```

Expected: no hits that copy item/season config appearance into the save payload. If any are found, add a `SAVE_SCHEMA_VERSION` bump (42 → 43) to the relevant phase and note it here. Record the result in the commit message of Task 1.

- [ ] **Step 0.3: No code change — record decisions**

The canonical sub-object name is **`look`**. Per-entity `look` schemas (colors are `number` on items/seasons but `string` on buildings/NPCs, so a single shared schema is intentionally NOT used). `power` (tool mechanic) and `sway` (already nested) stay as their own fields; `sway` is nested *under* `look` (it is pure animation) while `power` stays a top-level sibling (it is gameplay, not appearance).

---

## Task 1: Wiki renders nested object fields as sub-groups (do this FIRST)

Doing the rendering enhancement first means every subsequent `look` migration is immediately visible/verifiable in the wiki, and the field reference stops looking flat.

**Files:**
- Modify: `src/balanceManager/schemaDoc.ts` (add `children` to `FieldDoc`, populate for object fields)
- Modify: `src/balanceManager/wiki/FieldsTable.tsx` (render children indented)
- Test: `src/__tests__/schemaDoc.nested.test.ts` (new)

- [ ] **Step 1.1: Write the failing test**

Create `src/__tests__/schemaDoc.nested.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { describeSchema } from "../balanceManager/schemaDoc.js";

describe("describeSchema nested objects", () => {
  it("exposes child fields for a nested object field", () => {
    const schema = z.object({
      label: z.string(),
      look: z
        .object({
          color: z.number().describe("Primary fill"),
          dark: z.number().describe("Outline"),
        })
        .describe("Visual appearance"),
    });
    const doc = describeSchema(schema);
    const look = doc.fields.find((f) => f.field === "look");
    expect(look).toBeDefined();
    expect(look!.children).toBeDefined();
    expect(look!.children!.map((c) => c.field)).toEqual(["color", "dark"]);
    expect(look!.children!.find((c) => c.field === "color")!.description).toBe("Primary fill");
  });

  it("leaves non-object fields without children", () => {
    const doc = describeSchema(z.object({ label: z.string() }));
    expect(doc.fields[0].children).toBeUndefined();
  });
});
```

- [ ] **Step 1.2: Run it, verify it fails**

Run: `npm test -- schemaDoc.nested`
Expected: FAIL (`children` is undefined — property does not exist yet).

- [ ] **Step 1.3: Add `children` to `FieldDoc` and populate it**

In `src/balanceManager/schemaDoc.ts`, add to the `FieldDoc` interface (after `description?: string;`):

```ts
  /** Present when this field is itself a Zod object — its sub-fields, one level deep. */
  children?: FieldDoc[];
```

Then in `describeSchema`, inside the `fields` map (after building `entry`, before `return entry;`), recurse one level when the unwrapped inner schema is an object:

```ts
    if (isZodObject(inner)) {
      try {
        entry.children = describeSchema(inner).fields;
      } catch {
        // leave children undefined on introspection failure
      }
    }
```

(`isZodObject` and `inner` are already in scope from the existing `unwrap` call.)

- [ ] **Step 1.4: Run the test, verify it passes**

Run: `npm test -- schemaDoc.nested`
Expected: PASS (both cases).

- [ ] **Step 1.5: Render children in FieldsTable**

In `src/balanceManager/wiki/FieldsTable.tsx`, the `tbody` currently maps `fields` to a single `<tr>` each. Replace the `{fields.map(...)}` body so that after a field's own row, any `children` render as indented sub-rows. Extract the existing row into a local renderer and call it recursively with a `depth` for left-padding:

```tsx
        <tbody>
          {fields.flatMap((f, i) => renderRows(f, i, 0, entity, showValue, columns.length))}
        </tbody>
```

Add this helper above `FieldsTable` (it reuses `formatValue`/`formatDefault` already in the file):

```tsx
function renderRows(
  f: FieldDoc,
  i: number,
  depth: number,
  entity: Record<string, unknown> | null,
  showValue: boolean,
  colCount: number,
): React.ReactNode[] {
  const liveParent = entity != null ? entity[f.field] : undefined;
  const rows: React.ReactNode[] = [
    <tr
      key={`${depth}-${f.field}`}
      style={{
        background: i % 2 === 0 ? COLORS.parchment : COLORS.parchmentDeep,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <td
        className="py-1.5 px-2 font-mono font-bold whitespace-nowrap align-top"
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
      >
        {depth > 0 ? "↳ " : ""}{f.field}
      </td>
      <td className="py-1.5 px-2 font-mono whitespace-nowrap align-top" style={{ color: COLORS.inkSubtle }}>
        {f.children ? "object" : f.type}
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap align-top">
        {f.optional ? (
          <span style={{ color: COLORS.inkSubtle }}>optional</span>
        ) : (
          <span style={{ color: COLORS.ember }} className="font-bold">required</span>
        )}
      </td>
      <td className="py-1.5 px-2 align-top">{formatDefault(f.field, f.default)}</td>
      {showValue && (
        <td className="py-1.5 px-2 align-top max-w-[200px]">
          {f.children ? <span style={{ color: COLORS.inkSubtle }}>—</span> : formatValue(f.field, liveParent)}
        </td>
      )}
      <td className="py-1.5 px-2 align-top" style={{ color: COLORS.inkSubtle }}>
        {f.description ?? "—"}
      </td>
    </tr>,
  ];
  if (f.children) {
    const childEntity =
      liveParent != null && typeof liveParent === "object"
        ? (liveParent as Record<string, unknown>)
        : null;
    f.children.forEach((c, ci) =>
      rows.push(...renderRows(c, i + ci + 1, depth + 1, childEntity, showValue, colCount)),
    );
  }
  return rows;
}
```

Keep the original flat `{fields.map(...)}` `<tr>` block deleted (replaced by the `flatMap` above). `colCount` is passed for future colspan use but unused now — drop the param if lint complains about unused args.

- [ ] **Step 1.6: Typecheck + lint + unit tests**

Run: `npm run typecheck && npm run lint && npm test -- schemaDoc.nested FieldsTable`
Expected: PASS / no new errors.

- [ ] **Step 1.7: Commit**

```bash
git add src/balanceManager/schemaDoc.ts src/balanceManager/wiki/FieldsTable.tsx src/__tests__/schemaDoc.nested.test.ts
git commit -m "wiki: render nested object schema fields as indented sub-groups"
```

---

## Task 2: Items (tiles / resources / tools) — the core appearance cluster

This is the largest phase. Migrate `color`, `dark`, `iconKey`, `anim`, `ms`, `sway` into `item.look`. **`power` stays top-level.**

**Files:**
- Modify: `src/config/schemas/shared.ts` (add `tileLookSchema`, `resourceLookSchema`, `toolLookSchema`)
- Modify: `src/config/schemas/item.ts` (replace flat fields with `look`)
- Modify: `src/constants.ts` (rewrap every ITEMS row; recipe-default block ~1016–1019)
- Modify readers: `src/textures.ts`, `src/textures/categories/farmIcons.ts`, `src/GameScene.ts`, `src/TileObj.ts`, `src/ui/toolRegistry.ts`, `src/ui/Hud.tsx`, `src/ui/Tools.tsx`, `src/ui/puzzleBoard.tsx`, `src/ui/primitives/ToolStrip.tsx`, `src/features/crafting/index.tsx`, `src/features/workers/index.tsx`, `src/features/orders/index.tsx`, `src/features/achievements/index.tsx`, `src/features/tileCollection/index.tsx`, `src/balanceManager/wiki/concepts.ts`, `src/balanceManager/tabs/IconsTab.tsx`, `src/balanceManager/iconUsage.ts`, `src/config/balance/applyAll.ts`
- Test: `src/__tests__/item-look.test.ts` (new) + update existing item tests

### 2a — schema

- [ ] **Step 2.1: Add per-kind look schemas to `shared.ts`**

Append to `src/config/schemas/shared.ts`:

```ts
const itemLookCommon = {
  iconKey: z.string().optional().describe("Icon registry key"),
  anim: z.string().optional().describe("Board animation name played for this item"),
  ms: z.number().optional().describe("Animation duration override in ms"),
};

export const tileLookSchema = z
  .object({
    color: z.number().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().describe("Dark/outline color (0xRRGGBB)"),
    sway: swayParamsSchema.optional(),
    ...itemLookCommon,
  })
  .describe("Visual appearance of a board tile");

export const resourceLookSchema = z
  .object({
    color: z.number().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().describe("Dark/outline color (0xRRGGBB)"),
    ...itemLookCommon,
  })
  .describe("Visual appearance of an inventory resource");

export const toolLookSchema = z
  .object({
    color: z.number().optional().describe("Primary fill color (0xRRGGBB)"),
    dark: z.number().optional().describe("Dark/outline color (0xRRGGBB)"),
    ...itemLookCommon,
  })
  .describe("Visual appearance of a tool");

export type TileLook = z.infer<typeof tileLookSchema>;
export type ResourceLook = z.infer<typeof resourceLookSchema>;
export type ToolLook = z.infer<typeof toolLookSchema>;
```

- [ ] **Step 2.2: Rewrite `item.ts` to nest `look`**

In `src/config/schemas/item.ts`: import the new look schemas; remove `iconKey`, `anim`, `ms` from `itemCommonOptional`; remove `color`/`dark`/`sway` from the three item schemas; add `look`.

```ts
import { tileLookSchema, resourceLookSchema, toolLookSchema, toolPowerDefinitionSchema } from "./shared.js";

const itemCommonOptional = {
  desc: z.string().optional().describe("Short description"),
  description: z.string().optional().describe("Longer description (Dev Panel)"),
  glyph: z.string().optional().describe("Legacy glyph label"),
  sellable: z.boolean().optional().describe("Whether the item can be sold at the market"),
  power: toolPowerDefinitionSchema.optional(),
  effect: z.string().optional().describe("Tool power id when power object is absent"),
  target: z.string().optional().describe("Default target for tap-target tools"),
};
```

Tile schema: replace `color`/`dark`/`sway`/(inherited iconKey/anim/ms) with `look: tileLookSchema`. Resource: `look: resourceLookSchema`. Tool: `look: toolLookSchema.optional()` (tools may omit appearance). Keep `kind`, `label`, `biome`, `value`, `next`, `effects`, `...itemCommonOptional`, and `.passthrough()`.

- [ ] **Step 2.3: Verify schema typecheck fails against current data**

Run: `npm run typecheck`
Expected: FAIL — `constants.ts` ITEMS rows still have flat `color`/etc. This confirms the schema is now authoritative; fixed in 2.4.

### 2b — data

- [ ] **Step 2.4: Rewrap every ITEMS row in `constants.ts`**

For each tile/resource/tool row, move `color`, `dark`, `iconKey`, `anim`, `ms`, `sway` into a `look: { … }` object. Example transform:

```js
// before
tile_grass_grass: { kind: "tile", biome: "farm", label: "Hay", color: 0xa8c769, dark: 0x4f6b3a, value: 1, next: "hay_bundle", sway: { amp: 4.0, freq: 0.00060, gust: 0.20 } },
// after
tile_grass_grass: { kind: "tile", biome: "farm", label: "Hay", value: 1, next: "hay_bundle", look: { color: 0xa8c769, dark: 0x4f6b3a, sway: { amp: 4.0, freq: 0.00060, gust: 0.20 } } },
```

```js
// before
flour: { kind: "resource", biome: "farm", label: "Flour", color: 0xf4e3c0, dark: 0x8a6a3a, value: 8, next: null },
// after
flour: { kind: "resource", biome: "farm", label: "Flour", value: 8, next: null, look: { color: 0xf4e3c0, dark: 0x8a6a3a } },
```

Tool rows: move `color`/`dark`/`iconKey`/`anim`/`ms` into `look`; leave `power` where it is.

- [ ] **Step 2.5: Update the recipe-default block (`constants.ts` ~1016–1019)**

```js
// before
rec.color = itemDef.color;
rec.anim = (itemDef.power && itemDef.power.anim) || itemDef.anim;
rec.ms = (itemDef.power && itemDef.power.ms) || itemDef.ms;
// after
rec.color = itemDef.look?.color;
rec.anim = (itemDef.power && itemDef.power.anim) || itemDef.look?.anim;
rec.ms = (itemDef.power && itemDef.power.ms) || itemDef.look?.ms;
```

(`rec.color` etc. on recipes are a separate runtime carrier and stay flat — only the *source* read changes.)

### 2c — readers (exact sites; adjust line numbers if drifted)

- [ ] **Step 2.6: Phaser render path**

- `src/textures.ts:116` `const tileColor = r.color;` → `r.look.color`
- `src/textures.ts:242` `const tileColor = r.color;` → `r.look.color`
- `src/textures.ts:84` `ctx.fillStyle = hex(res.dark);` → `hex(res.look.dark)`
- `src/textures/categories/farmIcons.ts:456` `grad.addColorStop(1, b.dark)` → only if `b` is an ITEMS row (verify; if `b` is a local palette object, leave it — it is likely NOT an item). Confirm provenance before editing.
- `src/TileObj.ts:137` `const sway = this.res.sway;` → `this.res.look?.sway`
- `src/GameScene.ts:1005` `(res as { color?: string }).color` → `(res as { look?: { color?: string } }).look?.color`
- `src/GameScene.ts:1798` `res.color || "#ffffff"` → `res.look?.color || "#ffffff"`
- `src/GameScene.ts:1825` `tileObj.res?.color || "#ffffff"` → `tileObj.res?.look?.color || "#ffffff"`

Note: `GameScene.ts:1312-1315` read `power.anim`/`power.ms`/`boardAnim` — these are on `power`, NOT moving. Leave unchanged.

- [ ] **Step 2.7: UI readers (items only)**

- `src/ui/toolRegistry.ts:40` `iconKey: item.iconKey ?? key` → `item.look?.iconKey ?? key`
- `src/ui/Hud.tsx:88` `<Icon iconKey={r.iconKey}` → `r.look?.iconKey` (verify `r` is an item/resource def)
- `src/ui/Tools.tsx:35,67` `def.iconKey` → `def.look?.iconKey`
- `src/ui/puzzleBoard.tsx:553,898,908,1575` `tool.iconKey` → `tool.look?.iconKey` (verify `tool` is an ITEMS-derived def, not a runtime tool-registry object that may already carry a flattened `iconKey` — see note below)
- `src/ui/primitives/ToolStrip.tsx:127` `tool.iconKey` → resolve via tool registry, not raw item (verify provenance)
- `src/features/crafting/index.tsx:553` `m.iconKey` → `m.look?.iconKey` (verify `m` is an item)
- `src/features/workers/index.tsx:63,131` `worker.iconKey` — **worker** entity, handled in Phase 6, NOT here. Skip.
- `src/features/orders/index.tsx:78,85` `itemDef?.color` → `itemDef?.look?.color`
- `src/features/achievements/index.tsx:156` `resource.color` → `resource.look?.color`
- `src/features/tileCollection/index.tsx:132` `res.color` → `res.look?.color`

> **Provenance guard:** `toolRegistry.ts` builds a runtime tool object that may copy `iconKey` to top level. If a reader consumes the *registry* object (not the raw ITEMS row), it keeps reading the flat field. Update `toolRegistry.ts` to source from `item.look?.iconKey` (Step 2.7 line 1); downstream registry consumers then need NO change. Audit each `tool.iconKey` site: if it reads the registry object, leave it; if it reads the raw item, nest it. Confirm by tracing the variable's origin.

- [ ] **Step 2.8: Wiki / balance readers (items only)**

- `src/balanceManager/wiki/concepts.ts:47` `color: item.color` → `item.look?.color`
- `src/balanceManager/tabs/IconsTab.tsx:47,115,265,266,276,292,296` `entry.color` → `entry.look?.color` **only where `entry` is an ITEMS row**; IconsTab also handles abilities/workers/seasons whose color moves in later phases — gate each line by which collection it iterates.
- `src/balanceManager/iconUsage.ts:149` `tool?.iconKey` → `tool?.look?.iconKey` (ability/worker/season lines move in their phases)
- `src/config/balance/applyAll.ts:58-59` `PALETTES.default.tiles[r.key] = r.color;` → `r.look?.color`

### 2d — overrides

- [ ] **Step 2.9: Item override schema + apply**

`src/config/schemas/itemOverride.ts`: replace flat `color`/`dark`/`anim`/`ms` with a nested optional `look` patch:

```ts
import { z } from "zod";

const itemLookOverrideSchema = z
  .object({
    color: z.number().optional(),
    dark: z.number().optional(),
    iconKey: z.string().optional(),
    anim: z.string().optional(),
    ms: z.number().optional(),
  })
  .strict();

export const itemOverrideSchema = z
  .object({
    label: z.string().optional(),
    value: z.number().optional(),
    next: z.union([z.string(), z.null()]).optional(),
    glyph: z.string().optional(),
    description: z.string().optional(),
    desc: z.string().optional(),
    effect: z.string().optional(),
    target: z.string().optional(),
    look: itemLookOverrideSchema.optional(),
  })
  .strict();
```

`src/config/applyOverrides.ts:123-124,132-133`: merge into `item.look` instead of flat:

```ts
// before: item.color = patch.color; item.dark = patch.dark; item.anim = patch.anim; item.ms = patch.ms;
if (patch.look) {
  item.look = { ...(item.look ?? {}), ...patch.look };
}
```

If any checked-in `balance.json` uses flat `color`/`dark`/`anim`/`ms` keys on items, update those entries to the nested `look` form (grep `balance.json`).

### 2e — types & tests

- [ ] **Step 2.10: Update item-shape tests + add look test**

Update any existing test asserting `ITEMS.x.color` to `ITEMS.x.look.color` (grep `src/__tests__` and `tests/` for `.color`/`.iconKey`/`.power.anim` on items — note `power.id`/`power.params` assertions in `more-tools.test.ts`, `clear-all-tools.test.ts`, `toolPowersCatalog.test.ts` do NOT change). Add `src/__tests__/item-look.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ITEMS } from "../constants.js";

describe("item.look", () => {
  it("tiles carry color/dark under look, never flat", () => {
    for (const [key, def] of Object.entries(ITEMS)) {
      if ((def as { kind?: string }).kind !== "tile") continue;
      expect((def as Record<string, unknown>).color, `${key} flat color`).toBeUndefined();
      expect((def as { look?: { color?: number } }).look?.color, `${key} look.color`).toBeTypeOf("number");
    }
  });
});
```

- [ ] **Step 2.11: Full gate**

Run: `npm run typecheck && npm run lint && npm test`
Expected: PASS. Fix any remaining flat-field reads the typechecker surfaces (the `.passthrough()` on item schemas means TS won't catch every stale read — rely on the grep from Step 0.1 plus runtime).

- [ ] **Step 2.12: Smoke the canvas**

Start `npm run dev`, load `/?visual=board-farm-chain-7`, confirm tiles render with correct colors/sway and no console errors. (Items touch the render path — this manual check guards against a missed reader.)

- [ ] **Step 2.13: Commit**

```bash
git add -A
git commit -m "items: group color/dark/iconKey/anim/ms/sway under look"
```

---

## Task 3: Seasons palette → `look`

**Files:**
- Modify: `src/constants.ts:280-284` (SEASONS literals) and `:1177` (palette map)
- Modify readers: `src/GameScene.ts:649`, `src/ui/Hud.tsx:148`, `src/ui/SeasonCinematic.tsx:38-39`, `src/balanceManager/wiki/concepts.ts:197`, `src/iso/BuildingGallery.tsx:89,117`, `src/balanceManager/iconUsage.ts:146`
- Optional: add `src/config/schemas/season.ts` (seasons currently have no schema)
- Test: `src/__tests__/new-icons-wiring.test.ts:10` (season iconKey), add season-look test

- [ ] **Step 3.1: Rewrap SEASONS literals**

```js
export const SEASONS = [
  { name: "Spring", look: { iconKey: "season_spring", bg: 0x7dbd48, fill: 0x8fd85a, accent: 0x5daa35 } },
  { name: "Summer", look: { iconKey: "season_summer", bg: 0x8fca45, fill: 0xf6c342, accent: 0xe3a92f } },
  { name: "Autumn", look: { iconKey: "season_autumn", bg: 0xb77b3a, fill: 0xd9792d, accent: 0xa65722 } },
  { name: "Winter", look: { iconKey: "season_winter", bg: 0x78aaca, fill: 0x91d9ff, accent: 0xd9f6ff } },
];
```

- [ ] **Step 3.2: Update the palette map (`constants.ts:1177`)**

```js
// before: [s.name, { bg: s.bg, fill: s.fill, accent: s.accent }]
[s.name, { bg: s.look.bg, fill: s.look.fill, accent: s.look.accent }]
```

- [ ] **Step 3.3: Update season readers**

- `src/GameScene.ts:649` `s.bg` → `s.look.bg`
- `src/ui/Hud.tsx:148` `season.fill ?? 0xe2b24a` → `season.look?.fill ?? 0xe2b24a`
- `src/ui/SeasonCinematic.tsx:38` `season.bg.toString(16)` → `season.look.bg.toString(16)`
- `src/ui/SeasonCinematic.tsx:39` `season.fill.toString(16)` → `season.look.fill.toString(16)`
- `src/balanceManager/wiki/concepts.ts:197` `s.bg` → `s.look.bg` (and `:196` `s.iconKey` → `s.look.iconKey`)
- `src/iso/BuildingGallery.tsx:89,117` `ss.bg` → `ss.look.bg`
- `src/balanceManager/iconUsage.ts:146` `season?.iconKey` → `season?.look?.iconKey`

(Do NOT touch `MapScene.ts:361` `r.fill` — region, out of scope.)

- [ ] **Step 3.4: (Optional) add a `season.ts` schema + wire into the wiki**

If you want the wiki to show seasons' grouped fields (it currently lists them as live-config-only): add `src/config/schemas/season.ts` with `look: { iconKey, bg, fill, accent }` and register it in `src/balanceManager/wiki/conceptSchemas.ts`. Otherwise the season grouping is data-only. Decide based on maintainer preference; default = add the schema for consistency with the wiki goal.

- [ ] **Step 3.5: Update season tests**

`src/__tests__/new-icons-wiring.test.ts:10` season `iconKey` → `look.iconKey`. Add an assertion that `SEASONS[0].look.bg` is a number and flat `SEASONS[0].bg` is undefined.

- [ ] **Step 3.6: Gate + commit**

Run: `npm run typecheck && npm run lint && npm test -- season`
Then:

```bash
git add -A
git commit -m "seasons: group iconKey/bg/fill/accent under look"
```

---

## Task 4: Buildings → `look` (string color)

**Files:**
- Modify: `src/config/schemas/building.ts:15` (and override `:29`)
- Modify: `src/types/items.ts:109` (`Building.color`)
- Modify: `src/constants.ts` (BUILDINGS rows — wrap `color` into `look`)
- Modify readers: `src/ui/Town.tsx:332`, `src/ui/TownVillagers.tsx:655` (`b.color`), `src/balanceManager/wiki/concepts.ts:92`, `src/config/applyOverrides.ts:181`
- Test: `src/__tests__/new-buildings.test.ts:18`

- [ ] **Step 4.1: Schema** — `building.ts`: replace `color: z.string()...` with `look: z.object({ color: z.string().describe("Accent color used for the building illustration") }).describe("Building visual appearance")`. Override schema (`:29`): `look: z.object({ color: z.string().optional() }).strict().optional()`.

- [ ] **Step 4.2: Type** — `src/types/items.ts:109`: replace `color: string;` with `look: { color: string };` in `Building`.

- [ ] **Step 4.3: Data** — wrap each BUILDINGS row's `color: "#…"` into `look: { color: "#…" }`.

- [ ] **Step 4.4: Readers**
- `src/ui/Town.tsx:332` `b.color` → `b.look.color`
- `src/ui/TownVillagers.tsx:655` `const color = b.color ?? v.hairColor;` → `b.look?.color ?? v.hairColor` (keep `v.hairColor` — villager, out of scope)
- `src/balanceManager/wiki/concepts.ts:92` `color: b.color` → `b.look?.color`
- `src/config/applyOverrides.ts:181` `b.color = patch.color;` → `if (patch.look?.color != null) b.look = { ...(b.look ?? {}), color: patch.look.color };`

(Do NOT touch `TownVillagers.tsx:770-843` `p.color` — patron/villager, out of scope.)

- [ ] **Step 4.5: Test** — `new-buildings.test.ts:18` `expect(typeof b.color)` → `expect(typeof b.look.color).toBe("string")`.

- [ ] **Step 4.6: Gate + commit**
Run: `npm run typecheck && npm run lint && npm test -- building`
```bash
git add -A
git commit -m "buildings: group accent color under look"
```

---

## Task 5: NPCs → `look` (string color)

**Files:**
- Modify: `src/types/items.ts:121` (`NPC.color`); NPC source map (find `NPCS`/`NPCS_BY_KEY` definition — grep `NPCS_BY_KEY =`)
- Modify readers: `src/ui/Modals.tsx:99,135,430`, `src/balanceManager/wiki/concepts.ts:103`, `src/features/orders/index.tsx:57`, `src/features/tutorial/index.tsx:84`, plus story-editor NPC reads that resolve a real NPC entity (`BondTimelinePanel.tsx:25`, `PlaythroughPanel.tsx:89`, `StatsPanel.tsx:91`, `Inspector.tsx:715`, `HeatmapPanel.tsx:115`, `storyEditor/index.tsx:323`, `storyEditor/shared.tsx:123,126`)
- Test: any NPC color assertion

- [ ] **Step 5.1: Type** — `src/types/items.ts:121`: `color: string;` → `look: { color: string };` in `NPC`.
- [ ] **Step 5.2: Data** — wrap each NPC row's `color` into `look: { color }` in the NPCS source map.
- [ ] **Step 5.3: Readers** — for each site above, `npc.color` → `npc.look?.color` (keep the existing `?:`/fallback, e.g. `:135` `npc.color : "#5a4a30"` → `npc.look?.color : "#5a4a30"`). For story-editor reads, confirm the variable is the resolved NPC entity (it is, where it comes from `NPCS_BY_KEY`/`npcInfo`), then nest. **Leave** `g.color`/`al.color`/`speakerInfo?.color` that are not NPC entities.
- [ ] **Step 5.4: Wiki** — `concepts.ts:103` `color: npc.color` → `npc.look?.color`.
- [ ] **Step 5.5: Gate + commit**
Run: `npm run typecheck && npm run lint && npm test`
```bash
git add -A
git commit -m "npcs: group color under look"
```

---

## Task 6: Settlement biomes + keepers → `look` (emoji icon)

**Files:**
- Modify: `src/config/schemas/biome.ts:6`, `src/config/schemas/keeper.ts:16`
- Modify: `src/types/items.ts:144` (`SettlementBiome.icon`)
- Modify: `src/constants.ts` (SETTLEMENT_BIOMES rows ~208-223) and keeper source
- Modify readers: `src/features/cartography/index.tsx:127` (keeper.icon), `:261` (b.icon), `src/features/zones/BiomePicker.tsx:38`, `src/features/zones/ZoneInfoModal.tsx:149`, `src/config/applyOverrides.ts:370,431`
- Test: `src/__tests__/settlement-biomes.test.ts:25`, `src/__tests__/keepers.test.ts:27`, `src/__tests__/bm-config-overrides.test.ts:47`

- [ ] **Step 6.1: Schemas** — `biome.ts:6` `icon: z.string()...` → `look: z.object({ icon: z.string().describe("Emoji rendered beside the biome name") }).describe("Biome visual appearance")`. `keeper.ts:16` → `look: z.object({ icon: z.string().optional() }).strict().optional()`.
- [ ] **Step 6.2: Type** — `SettlementBiome.icon` → `look: { icon: string }`.
- [ ] **Step 6.3: Data** — wrap biome `icon: "🌾"` → `look: { icon: "🌾" }` in SETTLEMENT_BIOMES; same for keepers.
- [ ] **Step 6.4: Readers** — `cartography/index.tsx:127` `keeper.icon` → `keeper.look?.icon`; `:261` `b.icon` → `b.look?.icon`; `BiomePicker.tsx:38` `b.icon` → `b.look?.icon`; `ZoneInfoModal.tsx:149` `biome.icon` → `biome.look?.icon`. `applyOverrides.ts:370` `k.icon = patch.icon` → nest under `look`; `:431` `b.icon = patch.icon` → nest. **Do NOT touch** `tileCollection/index.tsx:289` `hazard.icon` (hazard — deferred), `townsfolk/index.tsx:36` `item.icon`, `MapScene.ts:911,917,1191` `view.icon`/`node.icon` (verify provenance — these are likely view/node config, NOT biome/keeper; leave unless they resolve a biome entity).
- [ ] **Step 6.5: Tests** — `settlement-biomes.test.ts:25` `b.icon` → `b.look.icon`; `keepers.test.ts:27` `k.icon` → `k.look?.icon`; `bm-config-overrides.test.ts:47` biome `.icon` → `.look.icon` (and update the override fixture to nest).
- [ ] **Step 6.6: Gate + commit**
Run: `npm run typecheck && npm run lint && npm test -- biome keeper`
```bash
git add -A
git commit -m "biomes+keepers: group icon under look"
```

---

## Task 7: Abilities + workers → `look` (iconKey, color)

**Files:**
- Modify: `src/config/schemas/ability.ts:16`, `src/config/schemas/worker.ts`
- Modify: `src/types/items.ts:55` (`Ability.iconKey`)
- Modify: ability + worker source maps
- Modify readers: `src/balanceManager/AbilitiesEditor.tsx:149,210`, `src/balanceManager/wiki/concepts.ts:74,75,174`, `src/features/workers/index.tsx:63,131`, `src/balanceManager/iconUsage.ts:140,143`, `src/balanceManager/shared.tsx:225`
- Test: `src/__tests__/icon-audit.test.ts:19-22`

- [ ] **Step 7.1: Schemas** — `ability.ts:16` `iconKey: z.string()` → `look: z.object({ iconKey: z.string().describe("Icon registry key for the ability badge") })`. `worker.ts` override: `look: z.object({ iconKey: z.string().optional(), color: z.string().optional() }).strict().optional()`.
- [ ] **Step 7.2: Type** — `Ability.iconKey: string` → `look: { iconKey: string }` (and add `look` to any worker type).
- [ ] **Step 7.3: Data** — wrap ability `iconKey` and worker `iconKey`/`color` into `look` in their source maps.
- [ ] **Step 7.4: Readers** — `AbilitiesEditor.tsx:149` `def.iconKey` → `def.look?.iconKey`; `:210` `def.icon` → confirm whether this is ability icon (nest) or something else; `concepts.ts:74` `w.iconKey` → `w.look?.iconKey`, `:75` `color: w.color` → `w.look?.color`, `:174` `a.iconKey` → `a.look?.iconKey`; `workers/index.tsx:63,131` `worker.iconKey` → `worker.look?.iconKey`; `iconUsage.ts:140` `ability?.iconKey` → `ability?.look?.iconKey`, `:143` `worker?.iconKey` → `worker?.look?.iconKey`; `shared.tsx:225` `opt.iconKey` → only if `opt` resolves an ability/worker (verify; this is a generic option renderer — likely needs the *caller* to pass the nested value, leave the component generic and fix call sites).
- [ ] **Step 7.5: Tests** — `icon-audit.test.ts:19-22` update ability/worker `iconKey` assertions to `look.iconKey` (tool/season already handled in their phases — keep this file consistent across all four).
- [ ] **Step 7.6: Gate + commit**
Run: `npm run typecheck && npm run lint && npm test -- ability worker icon-audit`
```bash
git add -A
git commit -m "abilities+workers: group iconKey/color under look"
```

---

## Task 8: Full verification + visual goldens

**Files:** none (verification only) + any golden snapshots refreshed.

- [ ] **Step 8.1: Whole-suite gate**
Run: `npm run typecheck && npm run typecheck:tests && npm run lint && npm test && npm run build`
Expected: all PASS. Resolve any stragglers.

- [ ] **Step 8.2: Stale-flat-field sweep**
Run (each must return ZERO hits against entity defs — review every remaining match and confirm it is an out-of-scope object):
```bash
git grep -nE "\bITEMS\b[^\n]*\bcolor:" -- src/constants.ts
git grep -nE "\.(color|dark|iconKey|anim|ms|sway|bg|fill|accent|icon)\b" -- 'src/**/*.ts' 'src/**/*.tsx' | grep -vi "look" | grep -vi "palette\|hair\|stage\|region\|theme\|story\|trigger\|hazard\|achievement" | sort
```
Triage each line: it must be either (a) an out-of-scope object from the Non-goals list, or (b) a `look.<field>` access. Anything else is a missed migration — fix it.

- [ ] **Step 8.3: Visual goldens**
Run: `npm run test:visual`
This change touches `GameScene`, `textures`, `features/*`, `ui/*` — UI is affected, so goldens MUST run. Inspect every diff. Colors/icons should be pixel-identical to before (the data moved, the rendered output did not). If a diff is unexpected, it means a reader was missed — fix it, do not bless the diff. If all diffs are intended (e.g. the wiki field table now shows nested rows), refresh:
```bash
npm run test:visual:update
git add -A && git commit -m "test: refresh visual goldens for look restructure"
```

- [ ] **Step 8.4: Wiki manual check**
`npm run dev` → `/b/` → Wiki → Tiles. Confirm the field reference shows `look` with indented `color`/`dark`/`iconKey`/`anim`/`ms`/`sway` sub-rows, and an entity article (e.g. Hay) shows the same grouping with live values. This is the deliverable the original request asked for.

- [ ] **Step 8.5: Push + PR**
```bash
git push -u origin claude/wiki-struct-organization-na9nk
```
Open a PR (non-draft per repo workflow) summarizing the `look` grouping per entity type and the wiki nested-rendering change. Include the Step 8.2 sweep result and the visual-golden outcome in the Test plan.

---

## Deferred (confirm with maintainer before doing)

- **Achievements `.icon`** (`features/achievements/index.tsx:82`, `iconUsage.ts:78,173`) and **Hazards `.icon`** (`features/tileCollection/index.tsx:289`) — appearance-bearing but no Zod schema and entangled with runtime reads. A Phase 9 could add `look: { icon }` to each with their own schema. Left out of the main sweep to keep the rename precise.
- **Tool-power visual fields** (`power.tint`, `power.anim`, `power.ms`, `power.bubble`) — already grouped under `power`; could be split into `power.look` but `power` is a mechanic, not pure appearance. Not recommended.

## Self-review notes

- Spec coverage: every appearance field from the audit (color, dark, iconKey, anim, ms, sway on items; bg/fill/accent/iconKey on seasons; color on buildings/NPCs; icon on biomes/keepers; iconKey/color on abilities/workers) has a task. Wiki-grouping goal covered by Task 1 + 3.4. Achievements/hazards explicitly deferred.
- Naming consistency: sub-object is `look` everywhere; `sway` nested under `look`; `power` left as sibling — consistent across tasks.
- Overloaded-name guards: Non-goals section + per-task "do NOT touch" callouts + Step 8.2 triage sweep guard against rewriting the wrong objects.
