import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VISUAL_DESKTOP_SMOKE_SCENARIO_IDS, VISUAL_SCENARIOS } from "../../src/visualTesting/matrix.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GOLDENS_DIR = path.resolve(HERE, "__goldens__");
export const MANIFEST_PATH = path.join(GOLDENS_DIR, "manifest.json");

const PROJECTS = ["desktop", "iphone-landscape", "iphone-portrait"];

function actionSummary(action) {
  if (!action || typeof action !== "object") return String(action);
  if (action.type === "api") return `${action.type}:${action.method}`;
  if (action.namePattern) return `${action.type}:${action.role}:${action.namePattern}`;
  if (action.name) return `${action.type}:${action.role}:${action.name}`;
  if (action.text) return `${action.type}:${action.text}`;
  if (action.placeholder) return `${action.type}:${action.placeholder}`;
  return action.type ?? JSON.stringify(action);
}

function expectationText(scenario) {
  const route = scenario.hash ?? `view:${scenario.view}`;
  const actionCount = scenario.actions?.length ?? 0;
  if (!actionCount) return `Scenario ${scenario.id} renders correctly at ${route}.`;
  return `Scenario ${scenario.id} renders correctly at ${route} after ${actionCount} scripted action${actionCount === 1 ? "" : "s"}.`;
}

function checklist(scenario) {
  const route = scenario.hash ?? `view:${scenario.view}`;
  const checks = [`Open ${route}.`];
  for (const action of scenario.actions ?? []) {
    checks.push(`Apply action ${actionSummary(action)}.`);
  }
  checks.push("Compare UI and canvas output to the golden image.");
  return checks;
}

function expectedScenarioIds(project) {
  if (project === "desktop") return new Set(VISUAL_DESKTOP_SMOKE_SCENARIO_IDS);
  return new Set(VISUAL_SCENARIOS.filter((s) => !s.skipProjects?.includes(project)).map((s) => s.id));
}

export function buildManifestFromGoldens() {
  const scenariosById = new Map(VISUAL_SCENARIOS.map((scenario) => [scenario.id, scenario]));
  const manifest = {};

  for (const project of PROJECTS) {
    const dir = path.join(GOLDENS_DIR, project);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".png")).sort()) {
      const scenarioId = file.replace(/\.png$/, "");
      const scenario = scenariosById.get(scenarioId);
      if (!scenario) continue;
      const key = `${project}/${file}`;
      manifest[key] = {
        scenarioId,
        routeHash: scenario.hash ?? null,
        view: scenario.view ?? null,
        actions: scenario.actions ?? [],
        expectation: expectationText(scenario),
        checklist: checklist(scenario),
      };
    }
  }

  return manifest;
}

export function validateManifest(manifest) {
  const errors = [];
  const scenarioIds = new Set(VISUAL_SCENARIOS.map((scenario) => scenario.id));

  for (const [key, entry] of Object.entries(manifest)) {
    const [project, fileName] = key.split("/");
    if (!PROJECTS.includes(project)) {
      errors.push(`Unknown project in manifest key: ${key}`);
      continue;
    }
    const fullPath = path.join(GOLDENS_DIR, project, fileName);
    if (!fs.existsSync(fullPath)) {
      errors.push(`Manifest entry references missing golden: ${key}`);
    }
    if (!scenarioIds.has(entry.scenarioId)) {
      errors.push(`Manifest entry references stale scenario: ${entry.scenarioId} (${key})`);
    }
  }

  for (const project of PROJECTS) {
    const dir = path.join(GOLDENS_DIR, project);
    if (!fs.existsSync(dir)) continue;
    const expected = expectedScenarioIds(project);
    for (const scenarioId of expected) {
      const key = `${project}/${scenarioId}.png`;
      const hasGolden = fs.existsSync(path.join(dir, `${scenarioId}.png`));
      if (hasGolden && !manifest[key]) {
        errors.push(`Golden missing manifest entry: ${key}`);
      }
    }
  }

  return errors;
}

export function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

export function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
