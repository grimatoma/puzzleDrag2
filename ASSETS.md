# Game Asset Inventory

Complete list of every visual and audio asset in the game. Currently all art is procedurally
generated (Canvas 2D API) or pure CSS. This document describes what each asset needs to look
like as a real production asset, including all required states and animations.

---

## 1. TILE TEXTURES

Each tile is **74 × 74 px** (export at 2× = 148 × 148 px for retina). Every resource needs
**two texture variants**: a base/idle state and a selected state.

There are two biomes — **Farm** and **Mine** — each with their own palette and resource set.

---

### 1.1 Farm Biome Tiles

All Farm tiles share a warm earthy palette. Background tile shape: rounded rectangle with
soft drop shadow.

| Key | Label | Tile Color | Icon Description | Tier |
|-----|-------|-----------|------------------|------|
| `hay` | Hay | `#8fcc3c` (green) | Bundle of hay / grass blades tied with twine | 1 |
| `wheat` | Wheat | `#f2c12e` (gold) | Wheat stalk with grain heads | 1 |
| `grain` | Grain | `#e8a820` (amber) | Pile of loose grain / seeds in a bowl | 2 |
| `flour` | Flour | `#f0ead0` (cream) | Small cloth flour sack with tied top | 3 |
| `log` | Log | `#a05c28` (brown) | Chopped log segment showing wood rings | 1 |
| `plank` | Plank | `#c87840` (sienna) | Two wooden planks stacked | 2 |
| `beam` | Beam | `#9a5820` (dark brown) | Thick structural timber beam | 3 |
| `egg` | Egg | `#fff7e5` (cream) | Single speckled egg | 1 |
| `berry` | Berry | `#e03060` (red) | Cluster of three round berries on a sprig | 1 |
| `jam` | Jam | `#b82050` (dark red) | Small jar with a cloth-tied lid | 2 |

**Selected state (all Farm tiles):** orange glowing border (`#ffb300`), slight scale-up (+6%),
inner warm highlight rim.

---

### 1.2 Mine Biome Tiles

All Mine tiles share a cool rocky palette.

| Key | Label | Tile Color | Icon Description | Tier |
|-----|-------|-----------|------------------|------|
| `stone` | Stone | `#9da3a8` (gray) | Rough irregular stone chunk | 1 |
| `cobble` | Cobble | `#7a8288` (dark gray) | Smoother rounded cobblestone | 2 |
| `block` | Block | `#505860` (slate) | Dressed rectangular stone block | 3 |
| `ore` | Ore | `#b9c4ce` (pale blue-gray) | Raw ore vein with metallic glint | 1 |
| `ingot` | Ingot | `#c0c8d0` (silver) | Cast metal ingot bar | 2 |
| `coal` | Coal | `#1e1e1e` (black) | Irregular lump of coal with faint sheen | 1 |
| `coke` | Coke | `#2a2a2a` (charcoal) | Processed coke briquette | 2 |
| `gem` | Gem | `#65e5ff` (cyan) | Faceted gem / crystal | 1 |
| `cutgem` | Cut Gem | `#30d0ff` (bright cyan) | Polished cut gem with sparkle | 2 |
| `gold` | Gold | `#ffd34c` (yellow) | Gold coin or nugget | 1 |

**Selected state (all Mine tiles):** same orange glow border as Farm.

---

### 1.3 Tile States & Animations

Every single tile (both biomes) must support:

| State | Description |
|-------|-------------|
| **Idle** | Normal resting state on the board |
| **Selected** | Tile is part of the active drag chain — glowing orange border, +6% scale |
| **Pulse** | One-shot pop when first added to chain — scale spikes to +12% then returns, 90 ms |
| **Collect / Disappear** | Tile flies off when chain is completed — shrinks to zero, fades out, slight random rotation ±25°, 180 ms |
| **Drop / Spawn** | Tile falls into place after board collapse — drops from above, elastic bounce land |
| **Shuffle / Biome Switch** | Full 360° spin in place, 280–300 ms |
| **Hover** | Subtle scale up (~3%) while cursor is over it during a drag |

---

## 2. SPARK / UPGRADE INDICATOR

**Key:** `spark`  
**Size:** 72 × 72 px (export at 2× = 144 × 144 px)  
**Location in code:** `src/textures.js` lines 238–266  
**Purpose:** Floats above every 3rd tile in a chain to signal an upcoming upgrade.

### Visual
A bright starburst / sparkle icon. Soft radial glow halo (yellow → transparent), 10-pointed
star body in yellow-gold, white highlight center dot.

### States & Animations
| State | Description |
|-------|-------------|
| **Idle sway** | Gentle ±10° rock back and forth continuously, 950 ms yoyo, Sine.InOut |
| **Pop-in** | Spawns from scale 0 → 0.72, angle −20° → +15°, 320 ms, Back.Out bounce |
| **With resource preview** | Small tile icon appears next to star showing what the upgrade will produce; fades in 260 ms after pop |
| **Dismiss** | Vanishes instantly when chain is cancelled or collected |

---

## 3. SEASON ICONS

**Size:** 42 × 42 px (export at 2× = 84 × 84 px)  
**Location in code:** `src/textures.js` lines 268–329  
**Purpose:** Displayed in the HUD season bar and season transition modal.

| Key | Season | Icon Description | Color |
|-----|--------|-----------------|-------|
| `season_flower` | Spring | 6-petal flower, white petals, yellow center | `#ffd43b` center |
| `season_sun` | Summer | Sun disc with 8 radiating rays | `#ffd34c` body, `#f1a91f` rays |
| `season_leaf` | Autumn | Single leaf on a short stem | `#d97a2b` leaf, `#8b4a12` stem |
| `season_snow` | Winter | 6-arm snowflake | `#eefbff` white-blue |

### States
These are static icons — no animation states required. They appear in the HUD as small
badges and in the season modal at 48 px display size.

---

## 4. BOARD & BACKGROUND

### 4.1 Board Background

**Location in code:** `src/GameScene.js` lines 137–166  
**Purpose:** Full viewport background behind the game board.

| Variant | Color | Notes |
|---------|-------|-------|
| Spring | `#7dbd48` | Bright grass green |
| Summer | `#8fca45` | Slightly lighter green |
| Autumn | `#b77b3a` | Warm brown-orange |
| Winter | `#78aaca` | Cool blue-gray |
| Mine (all seasons) | `#31404a` | Dark slate, no seasonal variation |

The background can be a flat color or a subtle full-screen illustration (sky gradient, distant
hills, etc.) — anything that does not compete with the board tiles.

### 4.2 Board Frame

**Location in code:** `src/GameScene.js` lines 137–166  
**Purpose:** The rounded-rectangle "dirt" border that surrounds the 6×7 tile grid.

| Variant | Fill Color | Notes |
|---------|-----------|-------|
| Farm | `#6d4a2f` | Rich soil / earth brown |
| Mine | `#242526` | Dark stone / charcoal |

Dimensions: fits exactly around the 6×7 grid (444 × 518 px at 74 px tiles) with ~14 px padding
on each side. Border radius: ~16 px.

### 4.3 Decorative Side Leaves

**Location in code:** `src/GameScene.js` lines 151–158  
**Purpose:** Organic decorations on the left and right sides of the board frame (Farm biome only).
Repeating elliptical leaf shapes, season accent color, ~55% opacity, alternating ±25° angle.

Not needed for Mine biome.

---

## 5. PATH DRAWING (Drag Chain Visuals)

These are runtime-drawn graphics (not pre-baked textures). The art team needs to define the
look; engineering will implement it in Canvas/Phaser graphics calls.

| Element | Current Look | Required Look |
|---------|-------------|--------------|
| **Path line** | 3-layer: thick yellow glow (22 px) + orange core (9 px) + white highlight (3 px) | Glowing rope or energy ribbon connecting selected tiles |
| **Node dot** | 3-layer circle: outer glow + orange core + white center | Glowing orb at each tile center on the path |
| **Expand ring burst** | Yellow circle expanding outward on tile-add | Light pulse ring / ripple on tile-add |

### Path Animations
| Animation | Description |
|-----------|-------------|
| **Segment grow** | Each new line segment draws itself from the previous tile to the new one, 160 ms, Quad.Out |
| **Line pulse** | Entire path alpha oscillates 0.78 → 1.0 in a breathing loop, 680 ms yoyo |
| **Ring burst** | Expanding ring at new tile position, fades out over 340 ms |

---

## 6. FLOATER TEXT (Resource Gain Popup)

**Location in code:** `src/GameScene.js` lines 521–526  
**Purpose:** "+3 Wheat" style popup that rises above the board when a chain is collected.

| Property | Value |
|----------|-------|
| Font | Bold, 22 px (at 1× dpr) |
| Color | `#ffd248` yellow |
| Stroke | Black, 5 px |

### Animation
1. Pops in: scale 0.7 → 1.0, 120 ms, Back.Out
2. Floats up: moves 58 px upward while fading to invisible, 780 ms, starting 120 ms after pop
3. Destroys itself on completion

---

## 7. CHAIN BADGE (HUD Chain Counter)

**Location in code:** `src/GameScene.js` lines 479–517  
**Purpose:** Displays "chain × 4" or "chain × 6  +2★" above the board during a drag.

| Property | Value |
|----------|-------|
| Background | Dark brown `#2b2218`, 90% opacity |
| Border | Orange `#ffd248`, 2 px |
| Font | Bold, 14 px, color `#ffd248` |
| Shape | Pill / rounded rectangle, 16 px radius |

No special animation. Appears while dragging, disappears when chain ends.

---

## 8. UI PANELS (React / CSS — no Phaser textures)

These are implemented in CSS. The art team provides the design system colors and any
decorative image assets (e.g., panel borders, badges). No sprite sheets needed.

### 8.1 HUD Top Bar

| Element | Description |
|---------|-------------|
| **Menu button** | Small square button "≡", background `#f6efe0`, border `#b28b62` |
| **Season bar** | Horizontal bar showing season icon + name, effect text, turn dots, turns remaining |
| **Turn dots** | 2.5 px circles — filled (season color), current (orange glow ring), empty (white with border) |
| **XP bar** | Gradient fill `#ff8b25` → `#ffb347`, level circle badge (red `#bb3b2f`) |

### 8.2 Side Panel (Tools & Orders)

| Element | Description |
|---------|-------------|
| **Tool buttons** | Grid of 2×N buttons, background `#9a724d`, hover `#b8845a`, border `#e6c49a` |
| **Tool badge counts** | Small pill top-right of button, dark bg `#2b2218`, border `#f7e2b6` |
| **Order buttons** | Full-width rows; ready state: green `#91bf24`; not-ready: dark `#4a2e18` |
| **Biome switcher** | Row of buttons; active: `#ffc239`; locked: `#6b4d34` with lock icon; inactive: `#6b4d34` |
| **Chain info** | Appears during drag in landscape, same style as Chain Badge above |

### 8.3 Inventory Grid

| Element | Description |
|---------|-------------|
| **Cell container** | Rounded, background `#b68d64`, border `#e6c49a` |
| **Icon square** | Colored square (resource color), white emoji glyph centered, slight drop shadow |
| **Count text** | White bold number, drop shadow |

### 8.4 Bottom Navigation

| Element | Description |
|---------|-------------|
| **Nav bar** | Dark `#2b2218`, border `#f7e2b6`, pill shape |
| **Active tab** | Background `#d6612a`, white text |
| **Inactive tab** | Transparent background, `#f7e2b6` text |

### 8.5 Mobile Dock (Portrait)

| Element | Description |
|---------|-------------|
| **Dock bar** | Dark `#3a2715`, top border `#b28b62` |
| **Tool / Orders buttons** | Large tap targets with emoji icon + text label |
| **Badge** | Red `#d6612a` (tools) or green `#91bf24` (orders) dot with count |
| **Bottom sheet** | Slides up from bottom, rounded top corners, drag handle bar |

---

## 9. TOWN VIEW

**Location in code:** `src/ui.jsx` lines 555–646  
**Purpose:** The main town overview screen between gameplay, showing buildings that can be
purchased or upgraded.

### 9.1 Background Scene

| Element | Description |
|---------|-------------|
| **Sky gradient** | Farm: `#b5d98c` → `#d4c97a` → `#6b9c3e`; Mine: `#7a8a96` → `#9a8878` → `#4a4e52`; Home: `#a8c5d6` → `#c5b48b` → `#7e9b5a` |
| **Sun / light source** | Circular glow, 64×64 px, color varies by biome |
| **Clouds** | Two rounded CSS divs, white semi-transparent, fixed positions |
| **SVG landscape** | Hills with road running through center, drawn as SVG paths |

The landscape is a good candidate for a real illustrated background image per biome.

### 9.2 Buildings

8 buildings total. Each needs:

| Element | Description |
|---------|-------------|
| **Roof** | Triangle clip, dark brown `#5a2e15` |
| **Body** | Colored rectangle, border and drop shadow |
| **Label** | Building name in white bold, centered |
| **Cost label** | Floats above building, semi-transparent dark bg |
| **Cost text colors** | Locked: `#f7d572` yellow; Affordable: `#9bdb6a` green; Not affordable: `#f7d572` yellow |

| Building | Color | Description |
|----------|-------|-------------|
| Hearth | `#c87a40` | Starting building, central |
| Mill | `#a0603c` | Grain milling |
| Bakery | `#c09060` | Bread production |
| Inn | `#8a6048` | Tavern / rest |
| Granary | `#b0784a` | Food storage |
| Larder | `#986040` | Preserve storage |
| Forge | `#707880` | Metal working |
| Caravan | `#8a6a50` | Trade |

---

## 10. MODALS

### 10.1 Season Transition Modal

| Element | Description |
|---------|-------------|
| **Container** | Parchment `#f4ecd8`, border `#b28b62`, rounded 20 px |
| **Season icon** | Large season icon (48 px display), one of the 4 season icons |
| **Title** | Bold, large, color `#744d2e` |
| **Description** | Italic, color `#6a4b31` |
| **Effect badge** | Pill shape, orange tint, border `#d6612a` |
| **Stats grid** | 4-column grid showing game stats in large bold numbers |
| **Continue button** | Green `#91bf24`, white border, white text, rounded |

**Entrance animation:** fade in, 200 ms ease-out.

### 10.2 Townsfolk / NPC Modal

| Element | Description |
|---------|-------------|
| **Container** | Parchment `#f4ecd8`, border `#b28b62`, rounded 20 px |
| **Header** | Title + close button (✕) |
| **Tabs** | Active: dark brown `#8a4a26`; Inactive: parchment `#f7ead8` |
| **Content** | Scrollable area |

### 10.3 Tool Long-Press Modal

| Element | Description |
|---------|-------------|
| **Overlay** | Black 60% opacity backdrop |
| **Card** | Dark brown `#3d2310`, border `#e6c49a`, rounded 16 px |
| **Icon** | 36 px emoji |
| **Description text** | White/80 opacity |
| **Close button** | `#9a724d`, hover `#b8845a` |

---

## 11. NPC SPEECH BUBBLE

**Location in code:** `src/ui.jsx` lines 696–718  
**Purpose:** Brief speech bubble from an NPC character that appears above the bottom nav.

| Element | Description |
|---------|-------------|
| **Bubble container** | Parchment `#f4ecd8`, border `#5a3a20`, rounded 16 px, drop shadow |
| **Avatar circle** | 40×40 px, NPC-specific color, white border, first-letter initial |
| **NPC name** | Bold, 12 px, color `#a8431a` |
| **Message text** | 13 px, color `#2b2218` |

**Entrance animation:** `bubblein` keyframe — scale from small + bounce, 340 ms
`cubic-bezier(.34,1.56,.64,1)`.

---

## 12. NPC AVATARS

Each NPC in the game has an avatar circle. Currently just a colored circle with a letter initial.
These should become small portrait illustrations or stylized character icons.

NPC list lives in `src/constants.js` (NPCS array). Each NPC has a name and a color. They
appear in:
- Speech bubble avatar (40×40 px display)
- Townsfolk modal tab content

Suggested size: **64 × 64 px** icon per NPC, circular crop.

---

## 13. CURSOR

**Location in code:** `src/TileObj.js` (useHandCursor: true on all tiles)

| State | Description |
|-------|-------------|
| **Default** | System arrow cursor |
| **Over tile** | Hand / pointer cursor (system default or custom) |
| **Dragging** | Currently same as hover; could be a "grabbing" hand custom cursor |

---

## 14. PARTICLES / VFX

Currently none are implemented as particle systems — all effects are tween-based. Future
particle assets that should be added:

| Effect | Trigger | Description |
|--------|---------|-------------|
| **Collect burst** | Chain collected | Small resource-colored sparkles bursting outward from collected tiles |
| **Upgrade sparkle** | Upgrade occurs | Gold/white sparkle burst at the upgraded tile |
| **Level up** | XP fills bar | Full-screen light flash + confetti-style particles |
| **Season change** | New season starts | Seasonal particles (petals, sun rays, falling leaves, snowflakes) drift across screen |

---

## 15. AUDIO ASSETS

All audio is currently Web Audio API synthesized. These are the sounds that need real audio files:

| Key | Trigger | Current Sound | Suggested Replacement |
|-----|---------|--------------|----------------------|
| `chainStart` | First tile tapped to begin chain | Rising bleep, 80 ms | Soft wooden click or chime |
| `chainCollect` | Chain successfully completed | Triple bleep arpeggio | Satisfying collect chime (3-note) |
| `upgrade` | Tile upgrades in chain | Sparkle sweep 880→1318 Hz | Magical sparkle / shine sound |
| `seasonTurn` | Season transitions | Warm bell 220 Hz, 400 ms | Bell toll or nature sound transition |
| `npcBubble` | NPC speech bubble appears | Soft pop | Character "bloop" or voice chirp |
| `levelUp` | Player levels up | Major chord arpeggio | Fanfare or triumphant short melody |
| `coinSpend` | Coins spent on building | Coin shimmer | Coin clink or purchase confirm |
| `error` | Invalid action | Descending buzz | Short negative click |

---

## 16. FONTS

| Usage | Current | Notes |
|-------|---------|-------|
| Tile glyph icons (upper-tier) | Newsreader / Times New Roman serif, 36 px | Could be replaced by actual icon sprites |
| HUD text | Arial / system sans | Should be a themed font (e.g., a chunky pixel or hand-lettered style) |
| Floater text | Arial bold | Same themed font as HUD |
| UI labels | System sans (Tailwind defaults) | Should match HUD font |

---

## 17. FULL ASSET COUNT SUMMARY

| Category | Count | Notes |
|----------|-------|-------|
| Tile textures (base + selected) | 20 resources × 2 = **40** | Farm: 10 resources, Mine: 10 resources |
| Spark / upgrade star | **1** | |
| Season icons | **4** | |
| Board frame (Farm / Mine) | **2** | Could be 9-slice PNG or vector |
| Season backgrounds | **4** Farm + **1** Mine = **5** | Or one per season per biome = 8 |
| NPC avatars | **TBD** (check constants.js for full NPC list) | |
| Building illustrations | **8** | One per building |
| Audio SFX | **8** | |
| Font | **1** (or 2 if separate display/body) | |
| **Total textures** | **~60** | Excluding audio and fonts |

---

## 18. EXPORT SPECIFICATIONS

| Asset Type | Base Size | Export at | Format |
|-----------|-----------|-----------|--------|
| Tile textures | 74 × 74 px | 1× and 2× | PNG, transparent background |
| Spark | 72 × 72 px | 1× and 2× | PNG, transparent background |
| Season icons | 42 × 42 px | 1× and 2× | PNG, transparent background |
| Board frame | Fits 444 × 518 px + 28 px padding | 1× and 2× | PNG or 9-slice PNG |
| Background scenes | 960 × 640 px (desktop) | 1× | PNG or JPG |
| NPC avatars | 64 × 64 px | 1× and 2× | PNG, circular or square with transparency |
| Building icons | 80–160 px wide (varies by building.w) | 1× and 2× | PNG, transparent background |
| Audio SFX | n/a | — | MP3 + OGG (for browser compatibility) |

All tile and icon sprites must have **transparent backgrounds**. Tile background shape
(rounded rectangle) should be part of the sprite itself so the shadow and depth are
baked in.
