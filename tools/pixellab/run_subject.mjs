// Config-driven seasonal-tile generation driver. Runs ONE phase at a time so a
// human gate can sit between phases (the whole point: a wrong summer anchor or an
// off-model season is cheap to catch by eye and expensive to discover after the
// downstream batch). Reads a subject config (default export) and calls the raw v2
// pipeline in pixellab.mjs.
//
//   node tools/pixellab/run_subject.mjs <config.mjs> <phase>
//   phase: summer | seasons | transitions | idles
//
// Config shape (see tools/pixellab/subjects/chicken.mjs):
//   { subject, size, assets,
//     summer: { generate:{style:[paths],desc} } | { existing:path },
//     seasons: { <name>:{ from:'summer'|'<season>', desc } },   // 'from' = which still to edit
//     transitions: [ { from,to,action,frames?,seed? } ],        // forward only
//     idles: { <season>:{ action, frames? } } }                 // first=last loop
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const [cfgPath, phase] = process.argv.slice(2);
const pl = await import(pathToFileURL(join(process.cwd(), 'tools/pixellab/pixellab.mjs')).href);
const cfg = (await import(pathToFileURL(resolve(cfgPath)).href)).default;
const A = cfg.assets || 'docs/seasonal-tile-system/assets';
const ANIM = `${A}/anim`;
const sub = cfg.subject;
const size = cfg.size || 128;
const still = (s) => `${A}/${sub}-${s}.png`;
const run = (label, fn) => fn().then((r) => ({ label, ok: true, saved: r.saved })).catch((e) => ({ label, ok: false, err: e.message }));

async function summer() {
  if (cfg.summer.existing) { console.log('summer = existing:', cfg.summer.existing); return; }
  const g = cfg.summer.generate;
  const r = await pl.generateWithStyle({ stylePaths: g.style, description: g.desc, size, out: `${A}/${sub}-summer_cand.png` });
  console.log(JSON.stringify({ candidates: r.saved }, null, 2));
  console.log(`\nGATE: view the 4 candidates, copy the chosen ${sub}-summer_cand_N.png -> ${sub}-summer.png, then run phase 'seasons'.`);
}

async function seasons() {
  const out = []; const done = new Set(['summer']); let rem = Object.keys(cfg.seasons);
  while (rem.length) {                                  // run each dependency level in parallel
    const level = rem.filter((n) => done.has(cfg.seasons[n].from));
    if (!level.length) throw new Error('unresolved season deps: ' + rem);
    out.push(...await Promise.all(level.map((n) => run(n, () => pl.editWithText({
      srcPath: still(cfg.seasons[n].from), description: cfg.seasons[n].desc, size, out: still(n) })))));
    level.forEach((n) => done.add(n)); rem = rem.filter((n) => !level.includes(n));
  }
  console.log(JSON.stringify(out, null, 2));
}

async function transitions() {
  const out = await Promise.all(cfg.transitions.map((t) => run(`${t.from}-${t.to}`, () => pl.animateTransition({
    startPath: still(t.from), endPath: still(t.to), action: t.action, frameCount: t.frames || 16, seed: t.seed,
    outDir: `${ANIM}/${sub}-${t.from}-${t.to}` }))));
  console.log(JSON.stringify(out, null, 2));
}

async function idles() {
  const out = await Promise.all(Object.entries(cfg.idles).map(([s, i]) => run(`idle-${s}`, () => pl.animateTransition({
    startPath: still(s), endPath: still(s), action: i.action, frameCount: i.frames || 8,
    outDir: `${ANIM}/${sub}-idle-${s}` }))));
  console.log(JSON.stringify(out, null, 2));
}

const phases = { summer, seasons, transitions, idles };
if (!phases[phase]) { console.log('phase: summer | seasons | transitions | idles'); process.exit(1); }
await phases[phase]();
