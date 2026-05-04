import { expect } from '@playwright/test';

export async function waitForBoot(page) {
  // Phaser is lazy-loaded; wait for canvas + the side panel orders
  await page.waitForSelector('canvas');
  await expect(page.getByText('Orders')).toBeVisible();
}

export async function clearSave(page) {
  // addInitScript runs before every page load (including reloads).
  // Clears the main save but marks tutorial as seen so it doesn't auto-start on first action.
  await page.addInitScript(() => {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('hearth.'))
        .forEach(k => localStorage.removeItem(k));
      // Suppress tutorial auto-start: the tutorial slice reads this key at module load time
      localStorage.setItem('hearth.tutorial.seen', '1');
    } catch {}
  });
}

export async function getReactState(page) {
  return await page.evaluate(() => {
    const root = document.getElementById('root');
    const fk = Object.keys(root).find(k => k.startsWith('__reactContainer'));
    let node = root[fk].stateNode.current.child;
    while (node) {
      if (node.memoizedState) {
        let h = node.memoizedState;
        while (h) {
          if (h.memoizedState && typeof h.memoizedState === 'object' && 'view' in h.memoizedState) {
            return h.memoizedState;
          }
          h = h.next;
        }
      }
      node = node.child || (node.return && node.return.sibling);
      if (!node) break;
    }
    return null;
  });
}

export async function dispatchAction(page, action) {
  // Reach into React fiber to find dispatch and call it
  await page.evaluate((act) => {
    const root = document.getElementById('root');
    const fk = Object.keys(root).find(k => k.startsWith('__reactContainer'));
    let node = root[fk].stateNode.current.child;
    while (node) {
      if (node.memoizedState) {
        let h = node.memoizedState;
        while (h) {
          if (h.queue && typeof h.queue.dispatch === 'function' && h.memoizedState && 'view' in h.memoizedState) {
            h.queue.dispatch(act);
            return;
          }
          h = h.next;
        }
      }
      node = node.child || (node.return && node.return.sibling);
      if (!node) break;
    }
  }, action);
}

export async function triggerChainViaScene(page, length = 3) {
  // Use Phaser scene API to start/extend/end a chain. Find first cluster of same-type tiles.
  const result = await page.evaluate(async (n) => {
    const scene = window.__phaserScene;
    if (!scene) return { error: 'no scene' };
    const tiles = scene.grid?.flat().filter(Boolean);
    if (!tiles?.length) return { error: 'no tiles' };
    // BFS to find a run of n adjacent same-type tiles
    function neighbors(t) { return tiles.filter(o => o !== t && Math.abs(o.col - t.col) <= 1 && Math.abs(o.row - t.row) <= 1 && !(o.col === t.col && o.row === t.row)); }
    for (const start of tiles) {
      const visited = new Set([start]);
      const path = [start];
      function ext(cur) {
        if (path.length >= n) return true;
        for (const nb of neighbors(cur)) {
          if (visited.has(nb)) continue;
          if (nb.res.key !== start.res.key) continue;
          visited.add(nb);
          path.push(nb);
          if (ext(nb)) return true;
          path.pop();
        }
        return false;
      }
      if (ext(start)) {
        scene.startPath(path[0]);
        for (let i = 1; i < path.length; i++) scene.tryAddToPath(path[i]);
        scene.endPath();
        return { ok: true, type: start.res.key, length: path.length };
      }
    }
    return { error: 'no chain found' };
  }, length);
  return result;
}
