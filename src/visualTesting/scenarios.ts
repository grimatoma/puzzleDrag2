import { VISUAL_SCENARIOS, visualScenarioById } from "./matrix.js";
import type { AnnotatedVisualScenario, DiffOptions, VisualAction } from "./matrix.js";
import { buildVisualState, validateVisualState } from "./stateBuilders.js";
import type { VisualStateTree } from "./stateBuilders.js";

export interface ListedVisualScenario {
  id: string;
  state: string | undefined;
  hash: string | null;
  view: string | null;
  actions: VisualAction[];
  diff: DiffOptions | null;
  skipProjects: string[];
}

export function listVisualScenarios(): ListedVisualScenario[] {
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

export interface BuiltVisualScenario extends AnnotatedVisualScenario {
  stateTree: VisualStateTree;
}

export function buildVisualScenario(id: string): BuiltVisualScenario {
  const scenario = visualScenarioById(id);
  if (!scenario) throw new Error(`Unknown visual scenario: ${id}`);
  const state = buildVisualState(scenario);
  const validationErrors = validateVisualState(state);
  if (validationErrors.length) {
    throw new Error(`Invalid visual scenario ${id}: ${validationErrors.join(", ")}`);
  }
  return { ...scenario, stateTree: state };
}

export function getVisualScenario(id: string): BuiltVisualScenario {
  return buildVisualScenario(id);
}

