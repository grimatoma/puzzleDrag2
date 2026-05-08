import { MAP_NODES, MAP_EDGES } from './data.js';

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
  mapVisited:    ['home'],
  mapDiscovered: ['home', 'meadow', 'orchard'],
  // activeZone mirrors mapCurrent so Phaser registry consumers (GameScene,
  // StartFarmingModal) can read it without knowing about mapCurrent.
  activeZone:    'home',
};

function edgeSet() {
  const set = new Set();
  for (const [a, b] of MAP_EDGES) {
    set.add(`${a}|${b}`);
    set.add(`${b}|${a}`);
  }
  return set;
}

const EDGES = edgeSet();

export function isAdjacent(a, b) {
  return EDGES.has(`${a}|${b}`);
}

function neighborsOf(nodeId) {
  return MAP_NODES
    .filter(n => isAdjacent(nodeId, n.id))
    .map(n => n.id);
}

function recomputeDiscovered(visited) {
  const next = new Set(visited);
  for (const v of visited) {
    for (const nid of neighborsOf(v)) next.add(nid);
  }
  return [...next];
}

export function reduce(state, action) {
  switch (action.type) {
    case 'CARTO/TRAVEL': {
      const { nodeId } = action;
      if (!nodeId || nodeId === state.mapCurrent) return state;

      const target = MAP_NODES.find(n => n.id === nodeId);
      if (!target) return state;

      // Backwards-compatible visited list: if the save predates `mapVisited`,
      // fall back to mapDiscovered (everything previously revealed counts as visited).
      const visited = state.mapVisited || state.mapDiscovered || ['home'];
      const playerLevel = state.level || 1;
      const alreadyVisited = visited.includes(nodeId);

      // Fast-travel: any visited node, from anywhere on the map.
      // First-visit: must be adjacent to current AND meet the level requirement.
      if (!alreadyVisited) {
        if (!isAdjacent(state.mapCurrent, nodeId)) return state;
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
