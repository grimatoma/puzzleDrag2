import { MAP_NODES, MAP_EDGES } from './data.js';

export const initial = {
  mapCurrent:    'home',
  mapDiscovered: ['home', 'meadow', 'orchard'],
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

function isAdjacent(a, b) {
  return EDGES.has(`${a}|${b}`);
}

function neighborsOf(nodeId) {
  return MAP_NODES
    .filter(n => isAdjacent(nodeId, n.id))
    .map(n => n.id);
}

function discoverNeighbors(discovered, current) {
  const next = new Set(discovered);
  for (const nid of neighborsOf(current)) {
    next.add(nid);
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

      if (!isAdjacent(state.mapCurrent, nodeId)) return state;

      const playerLevel = state.level || 1;
      if (target.level > playerLevel) return state;

      const discovered = discoverNeighbors(
        state.mapDiscovered.includes(nodeId)
          ? state.mapDiscovered
          : [...state.mapDiscovered, nodeId],
        nodeId
      );

      const base = { ...state, mapCurrent: nodeId, mapDiscovered: discovered };

      switch (target.kind) {
        case 'farm':
          return { ...base, biomeKey: 'farm', view: 'town' };
        case 'mine':
          return { ...base, biomeKey: 'mine', view: 'town' };
        case 'home':
          return { ...base, view: 'town' };
        case 'festival':
          return { ...base, modal: 'festivals' };
        case 'boss':
          return { ...base, modal: 'boss' };
        case 'event':
          return { ...base, bubble: '🎲 You meet a stranger…' };
        default:
          return base;
      }
    }
    default:
      return state;
  }
}
