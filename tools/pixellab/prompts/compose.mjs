// The composer. Takes a THIN subject config + the meta-prompt layers (framing, style,
// seasons, category playbook) and produces a fully-quantified prompt for every object
// state: the summer generate, each season edit, each forward transition, each idle.
//
// This is the piece that was missing: the configs used to hand-write one-line deltas,
// so each API call dropped the framing geometry, full season dressing, identity/footprint
// lock and palette lock -> drift. buildPlan() now emits the COMPLETE prompt per state.
//
// Output shape matches what run_subject.mjs consumes, so the driver just runs the plan.

import { SEASONS, SEASON_ORDER, seasonDressing } from "./seasons.mjs";
import { STYLE_WORDS, STYLE_LOCK, FRAMING, FOOTPRINT_LOCK, PAD_LOCK } from "./framing.mjs";
import { CATEGORIES, TOKEN_DEFAULTS } from "./categories.mjs";

const CANONICAL_ANCHORS = [
  "docs/seasonal-tile-system/assets/willow-summer.png",
  "docs/seasonal-tile-system/assets/eggplant-summer.png",
];

function fill(t, ctx) {
  return String(t).replace(/\{(\w+)\}/g, (_, k) => (ctx[k] != null ? ctx[k] : `{${k}}`));
}

/** A strong, subject-specific lock. For constant subjects (animals/minerals/objects)
 *  this is the load-bearing consistency lever — keep the creature pixel-identical,
 *  season the GROUND only — which fixes both the size/angle drift and the recolour
 *  (a white chicken going orange under autumn light). */
function subjectLock(cfg, cat, ctx) {
  if (cat.constant) {
    const dflt =
      `keep the ${cfg.subject} pixel-for-pixel identical INCLUDING its exact own colours — ` +
      `do not recolour, tint, shade, resize, move or reshape it; the season light touches the GROUND ONLY`;
    return cfg.paletteLock ? `${dflt} (${cfg.paletteLock})` : dflt;
  }
  // Morphing subjects: the foliage/skin changes, but a named part (trunk, calyx) and the
  // footprint must hold. paletteLock pins parts the season light likes to wrongly tint.
  return cfg.paletteLock || "";
}

function composeSummer(cfg, cat, ctx) {
  if (cfg.summer && cfg.summer.existing) return { existing: cfg.summer.existing };
  const desc =
    `${fill(cfg.identity, ctx)}; ${fill(cat.fills, ctx)}; ` +
    `${SEASONS.summer.pad}, ${SEASONS.summer.light}, ${SEASONS.summer.palette}. ` +
    `${FRAMING}. ${STYLE_WORDS}.`;
  return {
    generate: {
      style: (cfg.summer && cfg.summer.style) || cfg.style || CANONICAL_ANCHORS,
      styleDescription: STYLE_WORDS,
      desc,
    },
  };
}

function composeSeasonEdit(cfg, cat, ctx, season, from) {
  const anchor = fill(cat.anchor, ctx);
  const isHinge = season === "baremound";
  const delta = isHinge ? fill(cat.hinge.season, ctx) : fill(cat.season[season], ctx);
  // The envelope lock applies to a deciduous tree's bare states (baremound + winter).
  const envelope =
    cat.hinge && (isHinge || season === "winter") ? ` ${fill(cat.hinge.envelopeLock, ctx)}.` : "";
  const lock = subjectLock(cfg, cat, ctx);
  const dressing = isHinge
    ? "soft light, NO snow yet" // bare-mound hinge: leaves down, snow not yet
    : seasonDressing(season);
  const parts = [
    `Pixel-art edit of the ${from} ${cfg.subject} tile.`,
    `Keep the SAME ${cfg.subject}: same ${anchor} and round pad. ${FOOTPRINT_LOCK}. ${PAD_LOCK}.`,
    `Change ONLY ${fill(cat.morphScope, ctx)} to ${isHinge ? "the bare-mound state" : season}: ${delta}; ${dressing}.`,
    lock ? `${lock}.` : "",
    envelope,
    `${STYLE_LOCK}.`,
  ];
  return { from, desc: parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim() };
}

function composeTransitions(cfg, cat, ctx) {
  const frames = (cfg.frames && cfg.frames.transition) || 16;
  const out = [];
  const pushT = (from, to, key, seedKey) => {
    out.push({
      from,
      to,
      action: `${fill(cat.trans[key], ctx)}; throughout, ${cfg.subject} keeps the same size, position and footprint`,
      frames,
      ...(cfg.seeds && cfg.seeds[seedKey] != null ? { seed: cfg.seeds[seedKey] } : {}),
    });
  };
  pushT("spring", "summer", "spring-summer", "spring-summer");
  pushT("summer", "autumn", "summer-autumn", "summer-autumn");
  if (cat.twoSegmentAutumnWinter) {
    pushT("autumn", "baremound", "autumn-baremound", "autumn-baremound");
    pushT("baremound", "winter", "baremound-winter", "baremound-winter");
  } else {
    pushT("autumn", "winter", "autumn-winter", "autumn-winter");
  }
  return out;
}

function composeIdles(cfg, cat, ctx) {
  const frames = (cfg.frames && cfg.frames.idle) || 8;
  const idles = {};
  for (const season of SEASON_ORDER) {
    const base = fill(cat.idle[season], ctx);
    const extra = ctx.idleChar ? ` (${ctx.idleChar})` : "";
    idles[season] = {
      action: `${base}${extra}; the first frame equals the last frame for a seamless loop, returning fully to rest`,
      frames,
    };
  }
  return idles;
}

/** Build the full generation plan for a subject from the meta-prompt layers. */
export function buildPlan(cfg) {
  const cat = CATEGORIES[cfg.category];
  if (!cat) throw new Error(`unknown category "${cfg.category}" (subject ${cfg.subject})`);
  const ctx = { ...TOKEN_DEFAULTS, item: cfg.subject, ...(cfg.overrides || {}), subject: cfg.subject };

  const seasons = {};
  for (const [name, from] of Object.entries(cat.graph)) {
    if (name === "summer") continue;
    seasons[name] = composeSeasonEdit(cfg, cat, ctx, name, from);
  }

  return {
    subject: cfg.subject,
    category: cfg.category,
    size: cfg.size || 128,
    decimateTo: cfg.decimateTo || null,
    assets: cfg.assets || "docs/seasonal-tile-system/assets",
    summer: composeSummer(cfg, cat, ctx),
    seasons,
    transitions: composeTransitions(cfg, cat, ctx),
    idles: composeIdles(cfg, cat, ctx),
  };
}

/** Render a plan as a reviewable Markdown sheet (one file per subject). */
export function renderPlanMarkdown(cfg, plan) {
  const cat = CATEGORIES[cfg.category];
  const L = [];
  L.push(`# ${cfg.subject} — composed seasonal prompts`);
  L.push("");
  L.push(`> Generated by the meta-prompt composer (\`tools/pixellab/prompts/\`). Do not hand-edit —`);
  L.push(`> edit the layers or \`subjects/${cfg.subject}.mjs\` and re-run \`run_subject.mjs … prompts\`.`);
  L.push("");
  L.push(`- **Category:** ${cat.label} (\`${cfg.category}\`)${cat.constant ? " · constant subject (season = pad+light only)" : ""}`);
  L.push(`- **Size:** generate at ${plan.size}px${plan.decimateTo ? `, decimate to ${plan.decimateTo}px for the game` : ""}`);
  L.push(`- **Identity:** ${fill(cfg.identity, { ...TOKEN_DEFAULTS, ...(cfg.overrides || {}) })}`);
  if (cfg.paletteLock) L.push(`- **Palette lock:** ${cfg.paletteLock}`);
  L.push("");
  L.push(`## Summer — generate-with-style-v2`);
  if (plan.summer.existing) {
    L.push(`_Uses existing anchor: \`${plan.summer.existing}\`_`);
  } else {
    L.push(`**Style anchors:** ${plan.summer.generate.style.map((s) => `\`${s}\``).join(", ")}`);
    L.push("");
    L.push("```text");
    L.push(plan.summer.generate.desc);
    L.push("```");
  }
  L.push("");
  L.push(`## Season stills — edit-images-v2 (edit_with_text)`);
  for (const name of ["spring", "autumn", "baremound", "winter"]) {
    if (!plan.seasons[name]) continue;
    L.push(`### ${name}  _(edit ← ${plan.seasons[name].from})_`);
    L.push("```text");
    L.push(plan.seasons[name].desc);
    L.push("```");
    L.push("");
  }
  L.push(`## Forward transitions — animate-with-text-v3`);
  for (const t of plan.transitions) {
    L.push(`### ${t.from} → ${t.to}  _(${t.frames} frames${t.seed != null ? `, seed ${t.seed}` : ""})_`);
    L.push("```text");
    L.push(t.action);
    L.push("```");
    L.push("");
  }
  L.push(`## Idle loops — animate-with-text-v3 (first frame = last frame)`);
  for (const season of SEASON_ORDER) {
    L.push(`### ${season}  _(${plan.idles[season].frames} frames)_`);
    L.push("```text");
    L.push(plan.idles[season].action);
    L.push("```");
    L.push("");
  }
  return L.join("\n");
}
