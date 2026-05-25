import { VISUAL_SCENARIOS, visualScenarioById } from "./matrix.js";
import { buildVisualState, validateVisualState } from "./stateBuilders.js";

export function listVisualScenarios() {
  return VISUAL_SCENARIOS.map((scenario) => ({
    id: scenario.id,
    state: scenario.state,
    hash: scenario.hash ?? null,
    view: scenario.view ?? null,
    actions: scenario.actions ?? [],
    diff: scenario.diff ?? null,
    skipProjects: scenario.skipProjects ?? [],
  }));
}

export function buildVisualScenario(id: any) {
  const scenario = visualScenarioById(id);
  if (!scenario) throw new Error(`Unknown visual scenario: ${id}`);
  const state = buildVisualState(scenario);
  const validationErrors = validateVisualState(state);
  if (validationErrors.length) {
    throw new Error(`Invalid visual scenario ${id}: ${validationErrors.join(", ")}`);
  }
  return { ...scenario, stateTree: state };
}

export function getVisualScenario(id: any) {
  return buildVisualScenario(id);
}

