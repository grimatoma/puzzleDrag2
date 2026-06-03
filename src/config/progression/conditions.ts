// src/config/progression/conditions.ts
import type { Cond, Leaf, Op, FactSnapshot, JsonValue } from "./types.js";

function isLeaf(c: Cond): c is Leaf {
  return typeof (c as Leaf).fact === "string";
}

function compare(actual: JsonValue | undefined, op: Op, expected: JsonValue | undefined): boolean {
  switch (op) {
    case "truthy": return actual !== undefined && actual !== null && actual !== false;
    case "eq": return actual === expected;
    case "ne": return actual !== expected;
    case "gte": case "lte": case "gt": case "lt": {
      const a = Number(actual), b = Number(expected);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      return op === "gte" ? a >= b : op === "lte" ? a <= b : op === "gt" ? a > b : a < b;
    }
    default: return false;
  }
}

/** Evaluate a condition against a flat fact snapshot. Pure; never throws on missing facts. */
export function evaluate(cond: Cond, snapshot: FactSnapshot): boolean {
  if (isLeaf(cond)) {
    return compare(snapshot[cond.fact], cond.op ?? "truthy", cond.value);
  }
  if ("all" in cond) return cond.all.every((c) => evaluate(c, snapshot));
  if ("any" in cond) return cond.any.some((c) => evaluate(c, snapshot));
  if ("not" in cond) return !evaluate(cond.not, snapshot);
  return false;
}

/** Every fact id referenced anywhere in the tree (for validation). */
export function factIdsIn(cond: Cond): string[] {
  if (isLeaf(cond)) return [cond.fact];
  if ("all" in cond) return cond.all.flatMap(factIdsIn);
  if ("any" in cond) return cond.any.flatMap(factIdsIn);
  if ("not" in cond) return factIdsIn(cond.not);
  return [];
}

const OP_SYM: Record<Op, string> = {
  eq: "=", ne: "≠", gte: "≥", lte: "≤", gt: ">", lt: "<", truthy: "",
};

/** Human-readable one-line summary of a condition, for the feed UI. */
export function describeCond(cond: Cond): string {
  if (isLeaf(cond)) {
    if ((cond.op ?? "truthy") === "truthy") return cond.fact;
    return `${cond.fact} ${OP_SYM[cond.op as Op]} ${String(cond.value)}`;
  }
  if ("all" in cond) return `(${cond.all.map(describeCond).join(" AND ")})`;
  if ("any" in cond) return `(${cond.any.map(describeCond).join(" OR ")})`;
  if ("not" in cond) return `NOT ${describeCond(cond.not)}`;
  return "?";
}
