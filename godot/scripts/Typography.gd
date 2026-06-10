class_name Typography
extends RefCounted
## Centralized font-size tokens for the port's UI. Mirrors Palette.gd: a stateless
## class_name global whose values are reachable as Typography.size(Typography.Role.BODY)
## WITHOUT an instance (so headless tests work before a scene tree exists).
##
## WHY: every screen previously hardcoded add_theme_font_size_override("font_size", N)
## with scattered magic numbers (10..54), sized for a ~360px-wide layout while the
## canvas is 720 logical px wide — so text read as small. These role tokens are the
## single source of truth; `scale` is the player-facing "Text Size" multiplier.

## Semantic font-size roles. Use the smallest role that fits the text's purpose.
enum Role { CAPTION, META, BODY, LABEL, SUBHEAD, HEADING, TITLE, DISPLAY, STREAK_DAY, KEEPER_ICON }

## Base px per role at scale 1.0 (the new defaults — ~1.3x bump on the small/body tier,
## gentler on titles). Keyed by Role enum value.
const BASE := {
	Role.CAPTION: 14,      ## tiny captions / progress %  (was 10, 11)
	Role.META: 16,         ## secondary meta / hints      (was 12)
	Role.BODY: 17,         ## dominant body text          (was 13)
	Role.LABEL: 19,        ## labels / costs / counts     (was 14, 15)
	Role.SUBHEAD: 21,      ## buttons / pills / tabs / subheads (was 16, 17, 18, 19, 20)
	Role.HEADING: 26,      ## card headers                (was 22)
	Role.TITLE: 30,        ## modal titles                (was 24, 26, 27, 28)
	Role.DISPLAY: 34,      ## primary screen titles       (was 30)
	Role.STREAK_DAY: 40,   ## daily-streak day number     (was 34)
	Role.KEEPER_ICON: 60,  ## keeper icon emoji           (was 54)
}

## Player "Text Size" multiplier, applied to every role. 1.0 = Normal. Main sets this
## from GameState.text_size_index at launch and on the menu toggle (a later task wires it).
static var scale: float = 1.0

## Index into TEXT_SCALES → the multiplier; TEXT_SIZE_LABELS is the matching UI label.
## (The "Text Size" setting cycles the index; these live here so the module owns the table.)
const TEXT_SCALES := [1.0, 1.15, 1.3]
const TEXT_SIZE_LABELS := ["Normal", "Large", "Larger"]

## The px size for a role at the current scale, rounded to a whole pixel.
static func size(role: int) -> int:
	assert(BASE.has(role), "Typography.size(): unknown role %d" % role)
	return int(round(float(BASE[role]) * scale))
