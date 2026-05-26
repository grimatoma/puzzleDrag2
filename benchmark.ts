import { RECIPES } from "./src/constants.js";
import { performance } from "perf_hooks";

const ITERATIONS = 10000;

function run() {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const recipesByOutput = (Object.values(RECIPES) as any[]).reduce((acc, recipe) => {
      if (!recipe?.item) return acc;
      if (!acc[recipe.item]) acc[recipe.item] = [];
      acc[recipe.item].push(recipe);
      return acc;
    }, {});
  }
  const end = performance.now();
  console.log(`Time taken for ${ITERATIONS} iterations: ${end - start} ms`);
}

run();
