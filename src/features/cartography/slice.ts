import { MAP_NODES, MAP_EDGES, type MapNode } from './data.js';
import { zoneTierGateReason } from '../zones/data.js';
import type { Action, GameState } from '../../types/state.js';

// Node states (derived in the UI):
//   visited    → player has been here at least once. Fast-travel allowed from anywhere.
//   discovered → adjacent to a visited node, but not yet visited. Travel here only from
//                an adjacent visited node, and only if its zone-tier prerequisite is met.
//   hidden     → not adjacent to any visited node. Shown as a faint "?".
//
// `mapVisited` is the canonical list of visited node ids. `mapDiscovered` is kept
// in sync (visited ∪ neighbors-of-visited) so the existing UI/save format keeps working.

export const initial = {
  mapCurrent:    'home',
  mapVisited:    ['home'] as string[],
  mapDiscovered: ['home', 'meadow', 'orchard'] as string[],
  // activeZone mirrors mapCurrent so Phaser registry consumers (GameScene,
  // StartFarmingModal) can read it without knowing about mapCurrent.
  activeZone:    'home',
};

function edgeSet(): Set<string> {
  const set = new Set<string>();
  for (const [a, b] of MAP_EDGES) {
    set.add(`${a}|${b}`);
    set.add(`${b}|${a}`);
  }
  return set;
}

const EDGES = edgeSet();

export function isAdjacent(a: string, b: string): boolean {
  return EDGES.has(`${a}|${b}`);
}

function neighborsOf(nodeId: string): string[] {
  return MAP_NODES
    .filter((n: MapNode) => isAdjacent(nodeId, n.id))
    .map((n: MapNode) => n.id);
}

function recomputeDiscovered(visited: string[]): string[] {
  const next = new Set<string>(visited);
  for (const v of visited) {
    for (const nid of neighborsOf(v)) next.add(nid);
  }
  return [...next];
}

interface TravelAction {
  type: Action["type"];
  nodeId?: string;
  payload?: { nodeId?: string };
  readonly [key: string]: unknown;
}

export function reduce(state: GameState, action: Action): GameState {
  const a = action as TravelAction;
  switch (action.type) {
    case 'CARTO/TRAVEL': {
      const nodeId = a.nodeId;
      if (!nodeId || nodeId === state.mapCurrent) return state;

      const target = MAP_NODES.find((n: MapNode) => n.id === nodeId);
      if (!target) return state;

      // Backwards-compatible visited list: if the save predates `mapVisited`,
      // fall back to mapDiscovered (everything previously revealed counts as visited).
      const visited: string[] = state.mapVisited.length ? state.mapVisited : state.mapDiscovered;
      const alreadyVisited = visited.includes(nodeId);

      // Fast-travel: any visited node, from anywhere on the map.
      // First-visit: must be adjacent to current AND meet the zone-tier prerequisite.
      if (!alreadyVisited) {
        if (!isAdjacent(state.mapCurrent, nodeId)) return state;
        if (zoneTierGateReason(state, nodeId)) return state;
      }

      const nextVisited = alreadyVisited ? visited : [...visited, nodeId];
      const nextDiscovered = recomputeDiscovered(nextVisited);

      const base: GameState = {
        ...state,
        mapCurrent: nodeId,
        mapVisited: nextVisited,
        mapDiscovered: nextDiscovered,
        activeZone: nodeId,
      };

      switch (target.kind) {
        case 'farm':
          return { ...base, biomeKey: 'farm', view: 'town' };
        case 'mine':
          return { ...base, biomeKey: 'mine', view: 'town' };
        case 'fish':
          return { ...base, biomeKey: 'fish', view: 'town' };
        case 'home':
          return { ...base, view: 'town' };
        case 'festival':
          return { ...base, modal: 'festivals' };
        case 'boss':
          return { ...base, modal: 'boss' };
        case 'event':
          return { ...base, bubble: { id: Date.now(), npc: 'wren', text: '🎲 You meet a stranger at the Crossroads…', ms: 2200 } };
        default:
          return base;
      }
    }
    default:
      return state;
  }
}
