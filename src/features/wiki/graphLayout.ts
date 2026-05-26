export const NODE_W = 120;
export const NODE_H = 72;
export const COL_STRIDE = 180;
export const ROW_STRIDE = 84;

interface RecipeIn {
  item: string;
  inputs: Record<string, number>;
  station: string;
}

export interface WikiNodeDef {
  key: string;
  label: string;
  rank: number;
  x: number;
  y: number;
}

export interface WikiEdgeDef {
  fromKey: string;
  toKey: string;
  qty: number;
  station: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cpX: number;
}

export interface BuildGraphResult {
  nodes: WikiNodeDef[];
  edges: WikiEdgeDef[];
  totalW: number;
  totalH: number;
}

export function buildGraph(recipes: Record<string, unknown>, labelFn: (k: string) => string): BuildGraphResult {
  const recipeList: RecipeIn[] = (Object.values(recipes) as unknown[]).filter(
    (r): r is RecipeIn => {
      const rec = r as Partial<RecipeIn> | null | undefined;
      return !!rec && typeof rec.item === "string" && !!rec.inputs && typeof rec.inputs === "object";
    },
  );

  const craftedItems = new Set<string>(recipeList.map((r) => r.item));
  const allKeys = new Set<string>(craftedItems);
  for (const r of recipeList) {
    for (const k of Object.keys(r.inputs)) allKeys.add(k);
  }

  const ranks = new Map<string, number>();
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
    if ((ranks.get(key) ?? 0) < 0) ranks.set(key, 0);
  }

  const byRank = new Map<number, string[]>();
  for (const [key, rank] of ranks) {
    if (!byRank.has(rank)) byRank.set(rank, []);
    byRank.get(rank)!.push(key);
  }
  for (const arr of byRank.values()) {
    arr.sort((a: string, b: string) => labelFn(a).localeCompare(labelFn(b)));
  }

  const nodeMap = new Map<string, WikiNodeDef>();
  let maxRank = 0;
  let maxNodesInAnyRank = 0;
  for (const [rank, keys] of byRank) {
    if (rank > maxRank) maxRank = rank;
    if (keys.length > maxNodesInAnyRank) maxNodesInAnyRank = keys.length;
    keys.forEach((key: string, idx: number) => {
      nodeMap.set(key, {
        key,
        label: labelFn(key),
        rank,
        x: rank * COL_STRIDE,
        y: idx * ROW_STRIDE,
      });
    });
  }

  const nodes: WikiNodeDef[] = [...nodeMap.values()];

  const edges: WikiEdgeDef[] = [];
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
