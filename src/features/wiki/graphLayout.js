export const NODE_W = 120;
export const NODE_H = 72;
const COL_STRIDE = 180;
const ROW_STRIDE = 84;

export function buildGraph(recipes, labelFn) {
  const recipeList = Object.values(recipes).filter(
    (r) => r && typeof r.item === "string" && r.inputs && typeof r.inputs === "object"
  );

  const craftedItems = new Set(recipeList.map((r) => r.item));
  const allKeys = new Set(craftedItems);
  for (const r of recipeList) {
    for (const k of Object.keys(r.inputs)) allKeys.add(k);
  }

  const ranks = new Map();
  for (const key of allKeys) {
    ranks.set(key, craftedItems.has(key) ? -1 : 0);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const r of recipeList) {
      const inputRanks = Object.keys(r.inputs).map((k) => ranks.get(k) ?? 0);
      if (inputRanks.some((rank) => rank < 0)) continue;
      const newRank = Math.max(...inputRanks) + 1;
      if (ranks.get(r.item) !== newRank) {
        ranks.set(r.item, newRank);
        changed = true;
      }
    }
  }

  for (const key of allKeys) {
    if (ranks.get(key) < 0) ranks.set(key, 0);
  }

  const byRank = new Map();
  for (const [key, rank] of ranks) {
    if (!byRank.has(rank)) byRank.set(rank, []);
    byRank.get(rank).push(key);
  }
  for (const arr of byRank.values()) {
    arr.sort((a, b) => labelFn(a).localeCompare(labelFn(b)));
  }

  const nodeMap = new Map();
  let maxRank = 0;
  let maxNodesInAnyRank = 0;
  for (const [rank, keys] of byRank) {
    if (rank > maxRank) maxRank = rank;
    if (keys.length > maxNodesInAnyRank) maxNodesInAnyRank = keys.length;
    keys.forEach((key, idx) => {
      nodeMap.set(key, {
        key,
        label: labelFn(key),
        rank,
        x: rank * COL_STRIDE,
        y: idx * ROW_STRIDE,
      });
    });
  }

  const nodes = [...nodeMap.values()];

  const edges = [];
  for (const r of recipeList) {
    const toNode = nodeMap.get(r.item);
    if (!toNode) continue;
    for (const [inputKey, qty] of Object.entries(r.inputs)) {
      const fromNode = nodeMap.get(inputKey);
      if (!fromNode) continue;
      const x1 = fromNode.x + NODE_W;
      const y1 = fromNode.y + NODE_H / 2;
      const x2 = toNode.x;
      const y2 = toNode.y + NODE_H / 2;
      edges.push({
        fromKey: inputKey,
        toKey: r.item,
        qty,
        station: r.station,
        x1,
        y1,
        x2,
        y2,
        cpX: (x1 + x2) / 2,
      });
    }
  }

  return {
    nodes,
    edges,
    totalW: (maxRank + 1) * COL_STRIDE,
    totalH: maxNodesInAnyRank * ROW_STRIDE,
  };
}
