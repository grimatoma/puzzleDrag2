import { performance } from 'perf_hooks';

interface VillagerRefs {
  wrap: HTMLDivElement | null;
  torso: HTMLDivElement | null;
  head: HTMLDivElement | null;
  legL: HTMLDivElement | null;
  legR: HTMLDivElement | null;
  armL: HTMLDivElement | null;
  armR: HTMLDivElement | null;
}

const entries: VillagerRefs[] = Array.from({ length: 10000 }, () => ({
  wrap: null, torso: null, head: null, legL: null, legR: null, armL: null, armR: null
}));

// Add some non-nulls to make it realistic
entries[500].wrap = {} as HTMLDivElement;

const ITERATIONS = 10000;

function runOld() {
  let count = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    for (const entry of entries) {
      const allNull = Object.values(entry).every((v) => v == null);
      if (allNull) count++;
    }
  }
  return count;
}

function runNew() {
  let count = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    for (const entry of entries) {
      const allNull = entry.wrap == null &&
        entry.torso == null &&
        entry.head == null &&
        entry.legL == null &&
        entry.legR == null &&
        entry.armL == null &&
        entry.armR == null;
      if (allNull) count++;
    }
  }
  return count;
}

// Warmup
runOld();
runNew();

const t0 = performance.now();
runOld();
const t1 = performance.now();

const t2 = performance.now();
runNew();
const t3 = performance.now();

console.log(`Old: ${(t1 - t0).toFixed(2)}ms`);
console.log(`New: ${(t3 - t2).toFixed(2)}ms`);
