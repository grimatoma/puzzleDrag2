export const MAP_NODES = [
  { id: 'home',       name: 'Hearthwood Vale',      kind: 'home',     x: 8,  y: 50, level: 1 },
  { id: 'meadow',     name: 'Greenmeadow',           kind: 'farm',     x: 22, y: 30, level: 1 },
  { id: 'orchard',    name: 'Wild Orchard',           kind: 'farm',     x: 22, y: 72, level: 2 },
  { id: 'crossroads', name: 'The Crossroads',         kind: 'event',    x: 38, y: 50, level: 2 },
  { id: 'quarry',     name: 'Cracked Quarry',         kind: 'mine',     x: 55, y: 28, level: 2 },
  { id: 'caves',      name: 'Lanternlit Caves',       kind: 'mine',     x: 55, y: 72, level: 4 },
  { id: 'fairground', name: "Drifter's Fairground",  kind: 'festival', x: 70, y: 50, level: 3 },
  { id: 'forge',      name: 'Black Forge',            kind: 'mine',     x: 84, y: 30, level: 5 },
  { id: 'pit',        name: 'The Pit',                kind: 'boss',     x: 90, y: 70, level: 6 },
];

export const MAP_EDGES = [
  ['home', 'meadow'],
  ['home', 'orchard'],
  ['meadow', 'crossroads'],
  ['orchard', 'crossroads'],
  ['crossroads', 'quarry'],
  ['crossroads', 'caves'],
  ['quarry', 'fairground'],
  ['caves', 'fairground'],
  ['fairground', 'forge'],
  ['fairground', 'pit'],
  ['forge', 'pit'],
];

export const NODE_COLORS = {
  home:     '#bb3b2f',
  farm:     '#91bf24',
  mine:     '#7c8388',
  festival: '#c8923a',
  boss:     '#3a1a1a',
  event:    '#5a7a9a',
};
