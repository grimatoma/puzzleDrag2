import { MAP_NODES, MAP_EDGES, type MapNode } from './data.js';
import type { Action, GameState } from '../../types/state.js';

// Node states (derived in the UI):
//   visited    → player has been here at least once. Fast-travel allowed from anywhere.
//   discovered → adjacent to a visited node, but not yet visited. Travel here only from
//                an adjacent visited node, and only if the player meets the level req.
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

interface CartoHostState {
  mapCurrent?: string;
  mapVisited?: string[];
  mapDiscovered?: string[];
  activeZone?: string;
  biomeKey?: string;
  view?: string;
  modal?: string | null;
  level?: number;
  bubble?: { id: number; npc: string; text: string; ms: number } | null;
}

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

interface TravelAction extends Action {
  nodeId?: string;
}

export function reduce(state: GameState, action: Action): GameState {
  const s = state as unknown as CartoHostState;
  const a = action as TravelAction;
  switch (action.type) {
    case 'CARTO/TRAVEL': {
      const nodeId = a.nodeId;
      if (!nodeId || nodeId === s.mapCurrent) return state;

      const target = MAP_NODES.find((n: MapNode) => n.id === nodeId);
      if (!target) return state;

      // Backwards-compatible visited list: if the save predates `mapVisited`,
      // fall back to mapDiscovered (everything previously revealed counts as visited).
      const visited: string[] = s.mapVisited || s.mapDiscovered || ['home'];
      const playerLevel = s.level || 1;
      const alreadyVisited = visited.includes(nodeId);

      // Fast-travel: any visited node, from anywhere on the map.
      // First-visit: must be adjacent to current AND meet the level requirement.
      if (!alreadyVisited) {
        if (!isAdjacent(s.mapCurrent ?? '', nodeId)) return state;
        if (target.level > playerLevel) return state;
      }

      const nextVisited = alreadyVisited ? visited : [...visited, nodeId];
      const nextDiscovered = recomputeDiscovered(nextVisited);

      const base = {
        ...state,
        mapCurrent: nodeId,
        mapVisited: nextVisited,
        mapDiscovered: nextDiscovered,
        activeZone: nodeId,
      } as GameState;

      switch (target.kind) {
        case 'farm':
          return { ...base, biomeKey: 'farm', view: 'town' } as GameState;
        case 'mine':
          return { ...base, biomeKey: 'mine', view: 'town' } as GameState;
        case 'fish':
          return { ...base, biomeKey: 'fish', view: 'town' } as GameState;
        case 'home':
          return { ...base, view: 'town' } as GameState;
        case 'festival':
          return { ...base, modal: 'festivals' } as GameState;
        case 'boss':
          return { ...base, modal: 'boss' } as GameState;
        case 'event':
          return { ...base, bubble: { id: Date.now(), npc: 'wren', text: '🎲 You meet a stranger at the Crossroads…', ms: 2200 } } as GameState;
        default:
          return base;
      }
    }
    default:
      return state;
  }
}
