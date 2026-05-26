import React, { useMemo } from 'react';
import { renderToString } from 'react-dom/server';
import { RECIPES, BIOMES } from "./src/constants.js";
import { InventoryGrid } from "./src/ui/Inventory.tsx";
import { performance } from "perf_hooks";

const ITERATIONS = 1000;
const biomeKey = Object.keys(BIOMES)[0];

function run() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    renderToString(
      <InventoryGrid
        inventory={{}}
        biomeKey={biomeKey}
        compact={false}
        orders={[]}
        state={{}}
        dispatch={() => {}}
      />
    );
  }
  const end = performance.now();
  console.log(`Render time for ${ITERATIONS} iterations: ${end - start} ms`);
}

run();
