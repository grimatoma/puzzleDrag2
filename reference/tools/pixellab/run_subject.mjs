// Config-driven seasonal-tile driver. Runs ONE phase at a time so a human gate can sit
// between phases (a wrong summer anchor or off-model season is cheap to catch by eye and
// expensive to discover after the downstream batch).
//
//   node tools/pixellab/run_subject.mjs <config.mjs> <phase>
//   phase: prompts | summer | seasons | transitions | idles
//
// THIN configs (subjects/<name>.mjs) carry only identity + locks + overrides; every
// per-state prompt is COMPOSED from the meta-prompt layers (tools/pixellab/prompts/).
//   `prompts` writes the full composed prompt set to reference/docs/seasonal-tile-system/prompts/
//            <subject>.md for review BEFORE any credits are spent (run this first).
import { pathToFileURL } from "node:url";
import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const [cfgPath, phase] = process.argv.slice(2);
const here = (p) => pathToFileURL(join(process.cwd(), p)).href;
const pl = await import(here("tools/pixellab/pixellab.mjs"));
const { buildPlan, renderPlanMarkdown } = await import(here("tools/pixellab/prompts/index.mjs"));
const rawCfg = (await import(pathToFileURL(resolve(cfgPath)).href)).default;
const plan = buildPlan(rawCfg); // composes summer/seasons/transitions/idles from the layers

const A = plan.assets;
const ANIM = `${A}/anim`;
const sub = plan.subject;
const size = plan.size;
const still = (s) => `${A}/${sub}-${s}.png`;
const run = (label, fn) =>
  fn().then((r) => ({ label, ok: true, saved: r.saved })).catch((e) => ({ label, ok: false, err: e.message }));

// Dump the fully-composed prompts to a reviewable per-subject Markdown sheet. No API.
async function prompts() {
  const md = renderPlanMarkdown(rawCfg, plan);
  const dir = "reference/docs/seasonal-tile-system/prompts";
  mkdirSync(dir, { recursive: true });
  const out = `${dir}/${sub}.md`;
  writeFileSync(out, md, "utf8");
  console.log(`wrote ${out} (${md.length} chars) — review before generating.`);
}

async function summer() {
  if (plan.summer.existing) {
    console.log("summer = existing:", plan.summer.existing);
    return;
  }
  const g = plan.summer.generate;
  const r = await pl.generateWithStyle({
    stylePaths: g.style,
    description: g.desc,
    styleDescription: g.styleDescription,
    size,
    out: `${A}/${sub}-summer_cand.png`,
  });
  console.log(JSON.stringify({ candidates: r.saved }, null, 2));
  console.log(
    `\nGATE: view the candidates, copy the chosen ${sub}-summer_cand_N.png -> ${sub}-summer.png, then run 'seasons'.`,
  );
}

async function seasons() {
  const out = [];
  const done = new Set(["summer"]);
  let rem = Object.keys(plan.seasons);
  while (rem.length) {
    // run each dependency level in parallel (a season can only edit from a finished one)
    const level = rem.filter((n) => done.has(plan.seasons[n].from));
    if (!level.length) throw new Error("unresolved season deps: " + rem);
    out.push(
      ...(await Promise.all(
        level.map((n) =>
          run(n, () =>
            pl.editWithText({ srcPath: still(plan.seasons[n].from), description: plan.seasons[n].desc, size, out: still(n) }),
          ),
        ),
      )),
    );
    level.forEach((n) => done.add(n));
    rem = rem.filter((n) => !level.includes(n));
  }
  console.log(JSON.stringify(out, null, 2));
}

async function transitions() {
  const out = await Promise.all(
    plan.transitions.map((t) =>
      run(`${t.from}-${t.to}`, () =>
        pl.animateTransition({
          startPath: still(t.from),
          endPath: still(t.to),
          action: t.action,
          frameCount: t.frames,
          seed: t.seed,
          outDir: `${ANIM}/${sub}-${t.from}-${t.to}`,
        }),
      ),
    ),
  );
  console.log(JSON.stringify(out, null, 2));
}

async function idles() {
  const out = await Promise.all(
    Object.entries(plan.idles).map(([s, i]) =>
      run(`idle-${s}`, () =>
        pl.animateTransition({
          startPath: still(s),
          endPath: still(s),
          action: i.action,
          frameCount: i.frames,
          outDir: `${ANIM}/${sub}-idle-${s}`,
        }),
      ),
    ),
  );
  console.log(JSON.stringify(out, null, 2));
}

const phases = { prompts, summer, seasons, transitions, idles };
if (!phases[phase]) {
  console.log("phase: prompts | summer | seasons | transitions | idles");
  process.exit(1);
}
await phases[phase]();
