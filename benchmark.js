import fs from 'fs';
const { performance } = await import('perf_hooks');

// Read constants manually to avoid node ESM issues with JSON imports
const code = fs.readFileSync('src/constants.js', 'utf8');

// I'll just write a basic JS benchmark without importing the full app code
// since we just need to compare Array.find vs Map.get
const dummyResources = [];
for (let i = 0; i < 50; i++) {
  dummyResources.push({ key: `res_${i}`, val: i });
}

const lookupKeys = [];
for (let i = 0; i < 100000; i++) {
  lookupKeys.push(`res_${i % 50}`);
}

const map = new Map(dummyResources.map(r => [r.key, r]));

// Warmup
for (let i = 0; i < 100; i++) {
  for (const key of lookupKeys) {
    dummyResources.find(r => r.key === key);
    map.get(key);
  }
}

const startBase = performance.now();
for (let i = 0; i < 100; i++) {
  for (const key of lookupKeys) {
    dummyResources.find(r => r.key === key);
  }
}
const endBase = performance.now();

const startOpt = performance.now();
for (let i = 0; i < 100; i++) {
  for (const key of lookupKeys) {
    map.get(key);
  }
}
const endOpt = performance.now();

console.log(`Baseline (Array.find): ${(endBase - startBase).toFixed(2)} ms`);
console.log(`Optimized (Map.get): ${(endOpt - startOpt).toFixed(2)} ms`);
