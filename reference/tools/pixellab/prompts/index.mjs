// Meta-prompt composition layer — public entry point.
//
//   buildPlan(thinSubjectConfig)  -> the full generation plan (summer/seasons/
//                                    transitions/idles), each state a fully-quantified
//                                    prompt composed from the layers below.
//   renderPlanMarkdown(cfg, plan) -> a reviewable per-subject prompt sheet.
//
// Layers (split into small files so no single file grows unwieldy and so the season /
// category / framing metas can be tuned independently):
//   framing.mjs     L0 style words + L1 framing/footprint locks
//   seasons.mjs     L2 the four season dressings
//   categories.mjs  L3+L4 the 12 category playbooks (lifecycle / idle / transition)
//   compose.mjs     the composer
export { buildPlan, renderPlanMarkdown } from "./compose.mjs";
export { CATEGORIES, TOKEN_DEFAULTS } from "./categories.mjs";
export { SEASONS, SEASON_ORDER } from "./seasons.mjs";
export { STYLE_WORDS, FRAMING, FOOTPRINT_LOCK } from "./framing.mjs";
