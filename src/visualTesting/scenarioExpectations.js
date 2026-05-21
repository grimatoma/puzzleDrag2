import { VISUAL_SCENARIOS } from "./matrix.js";

export const SCENARIO_EXPECTATIONS = VISUAL_SCENARIOS.map((scenario) => ({
  id: scenario.id,
  expectation: scenario.expectation,
  reviewChecklist: [...(scenario.reviewChecklist ?? [])],
}));

export function scenarioExpectationById(id) {
  return SCENARIO_EXPECTATIONS.find((scenario) => scenario.id === id) ?? null;
}
