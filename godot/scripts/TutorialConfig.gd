class_name TutorialConfig
extends RefCounted
## Pure data: the 6-step tutorial onboarding content (ported from
## src/features/tutorial/index.tsx — the STEPS array). No scene references;
## instantiable by headless tests without a running scene tree.
##
## Each step is a Dictionary { "id": String, "title": String, "body": String,
## "anchor": String }. The anchor field ("center" | "corner") is carried as a
## hint for consumers; the Godot TutorialModal always shows as a centered modal
## regardless, so callers may ignore it.

## The narrating NPC — Wren the Scout (the React tutorial guide). A real NpcConfig roster member
## (no fake). Lives here (Batch 9 D8) beside the tutorial STEPS it narrates, rather than as a
## modal-local const, so the speaker id is data the modal reads.
const TUTORIAL_NPC: String = "wren"

## The 6 onboarding steps, faithful to the React source.
const STEPS: Array = [
	{
		"id": "welcome",
		"title": "Welcome to Hearthwood Vale",
		"body": "You're the new caretaker. Restore the vale — chain by chain, season by season.",
		"anchor": "center",
	},
	{
		"id": "chains",
		"title": "Drag chains",
		"body": "Touch and drag across 3+ matching tiles on the board. Lift to harvest.",
		"anchor": "corner",
	},
	{
		"id": "upgrades",
		"title": "Upgrades ⭐",
		"body": "Every 3rd tile in your chain upgrades to the next tier. Long chains snowball — try chains of 6+.",
		"anchor": "center",
	},
	{
		"id": "orders",
		"title": "Orders",
		"body": "Townsfolk leave standing orders. Gather what they need, then tap to deliver.",
		"anchor": "corner",
	},
	{
		"id": "town",
		"title": "Town",
		"body": "Open ⌂ Town below to build mills, bakeries, and forges with your earnings.",
		"anchor": "corner",
	},
	{
		"id": "ready",
		"title": "You're ready",
		"body": "Seasons turn fast. Make every chain count.",
		"anchor": "center",
	},
]

## All steps as an Array (same reference as STEPS — provided for symmetry with
## helpers below, and to allow a future override without changing callers).
static func all() -> Array:
	return STEPS

## Number of tutorial steps.
static func count() -> int:
	return STEPS.size()
