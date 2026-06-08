class_name Palette
extends RefCounted
## The "leather-bound journal" parchment palette — ported from the React+Phaser
## game's design tokens (src/tokens.css). A stateless `class_name` global: every
## value is a `const Color`, reachable as `Palette.PARCHMENT` WITHOUT an instance
## (mirrors how Constants is consumed, so it also works in headless tests before a
## scene tree exists).
##
## Hex bytes come straight from tokens.css; `Color8(r, g, b)` builds a Color from
## 0–255 channel values so the bytes match the source exactly.

# ── Parchment surfaces ──────────────────────────────────────────────────────
const PARCHMENT      := Color8(0xf6, 0xef, 0xe0)   ## #f6efe0 — main parchment
const PARCHMENT_SOFT := Color8(0xfb, 0xf7, 0xeb)   ## #fbf7eb — soft highlight paper
const PAPER          := Color8(0xf9, 0xf2, 0xdd)   ## #f9f2dd — page
const DIM            := Color8(0xe9, 0xdf, 0xc6)   ## #e9dfc6 — dim parchment
const FRAME_BG       := Color8(0xf4, 0xec, 0xd6)   ## #f4ecd6 — app frame backdrop

# ── Ink text ────────────────────────────────────────────────────────────────
const INK            := Color8(0x2b, 0x22, 0x18)   ## #2b2218 — ink-dark (headings)
const INK_MID        := Color8(0x7a, 0x5e, 0x3f)   ## #7a5e3f — ink-mid (secondary)

# ── Borders ─────────────────────────────────────────────────────────────────
const IRON           := Color8(0xc9, 0xb9, 0x93)   ## #c9b993 — iron border

# ── Accents ─────────────────────────────────────────────────────────────────
const EMBER          := Color8(0xd6, 0x61, 0x2a)   ## #d6612a — ember
const EMBER_SOFT     := Color8(0xff, 0x8b, 0x25)   ## #ff8b25 — ember soft
const GOLD           := Color8(0xe2, 0xb2, 0x4a)   ## #e2b24a — gold
const GOLD_BRIGHT    := Color8(0xff, 0xd2, 0x48)   ## #ffd248 — gold bright
const MOSS           := Color8(0x6f, 0x8a, 0x3a)   ## #6f8a3a — moss (status text / bars)
## Affirmative CTA fill — the vivid leaf-green React uses for its primary "go" buttons
## (Claim / Build / Craft / Contribute / Continue). Ported VERBATIM from components.css
## `.hl-btn--go { background:#5e8c1e }` — brighter + more saturated than the olive MOSS so
## an enabled positive action reads as a clear call-to-action. White text via _contrast_text.
const GO_GREEN       := Color8(0x5e, 0x8c, 0x1e)   ## #5e8c1e — affirmative CTA (React hl-btn--go)

# ── Farm field (board background) ───────────────────────────────────────────
## A calm warm green for the board card, with a slightly darker inner edge.
const FIELD          := Color(0.50, 0.66, 0.28)    ## board field tint
const FIELD_EDGE     := Color(0.40, 0.53, 0.22)    ## darker inner edge / border

# ── Chain path ──────────────────────────────────────────────────────────────
## VALID chain (length ≥ board.min_chain): warm orange line, gold halo/nodes.
const CHAIN_VALID_LINE := Color8(0xff, 0x6d, 0x00)  ## #ff6d00
const CHAIN_VALID_NODE := Color8(0xff, 0xd2, 0x48)  ## #ffd248
## INVALID chain (too short): muddy rust line + node.
const CHAIN_BAD_LINE   := Color8(0x9a, 0x46, 0x30)  ## #9a4630
const CHAIN_BAD_NODE   := Color8(0xc0, 0x6b, 0x3e)  ## #c06b3e
