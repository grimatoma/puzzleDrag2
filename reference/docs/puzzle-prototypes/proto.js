/* ============================================================================
   puzzleDrag2 — Puzzle Prototypes shared engine (PD)
   Tiny, robust helpers reused by all 10 prototypes so they look + feel cohesive.
   Pages load this with: <script src="../proto.js"></script>  (defines window.PD)
   Nothing here knows any prototype's rules — each page owns its own model.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---- families: glyph + css class + label (matches game resource families) */
  const FAM = {
    grass:  { g:'🌿', label:'Grass',     res:'Hay'    },
    grain:  { g:'🌾', label:'Grain',     res:'Flour'  },
    tree:   { g:'🌳', label:'Tree',      res:'Plank'  },
    fruit:  { g:'🍎', label:'Fruit',     res:'Pie'    },
    veg:    { g:'🥕', label:'Vegetable', res:'Soup'   },
    flower: { g:'🌸', label:'Flower',    res:'Honey'  },
    bird:   { g:'🐔', label:'Bird',      res:'Eggs'   },
    cattle: { g:'🐄', label:'Cattle',    res:'Milk'   },
    fish:   { g:'🐟', label:'Fish',      res:'Fillet' },
    clam:   { g:'🐚', label:'Clam',      res:'Shells' },
    kelp:   { g:'🦪', label:'Kelp',      res:'Oil'    },
    pearl:  { g:'🫧', label:'Pearl',     res:'Pearl'  },
    stone:  { g:'🪨', label:'Stone',     res:'Block'  },
    iron:   { g:'⛓️', label:'Iron',      res:'Bar'    },
    copper: { g:'🟤', label:'Copper',    res:'Bar'    },
    coal:   { g:'⚫', label:'Coal',      res:'Coke'   },
    gem:    { g:'💎', label:'Gem',       res:'Cut gem'},
    gold:   { g:'🟡', label:'Gold',      res:'Ingot'  },
    water:  { g:'💧', label:'Water',     res:'Water'  },
    salt:   { g:'🧂', label:'Salt',      res:'Salt'   },
    spice:  { g:'🌶️', label:'Spice',     res:'Spice'  },
    rune:   { g:'✦',  label:'Rune',      res:'Rune'   },
  };

  /* ---- seeded RNG (mulberry32) — deterministic, no Date/Math.random surprises */
  function rng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const randInt = (r, n) => Math.floor(r() * n);
  const choice  = (r, arr) => arr[randInt(r, arr.length)];
  const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function shuffle(r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randInt(r, i + 1);[a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---- adjacency helpers (r,c) ----------------------------------------- */
  const N4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const N8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const adj8 = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1;
  const adj4 = (a, b) => (Math.abs(a.r - b.r) + Math.abs(a.c - b.c)) === 1;

  /* ---- grid DOM render -------------------------------------------------- */
  // Builds rows*cols .cell elements inside boardEl. paint(cell, r, c) decorates each.
  // Returns a 2D array of the cell elements: cells[r][c].
  function renderGrid(boardEl, rows, cols, paint) {
    boardEl.style.setProperty('--cols', cols);
    boardEl.style.setProperty('--ar', cols / rows);
    boardEl.innerHTML = '';
    const cells = [];
    for (let r = 0; r < rows; r++) {
      cells[r] = [];
      for (let c = 0; c < cols; c++) {
        const el = document.createElement('div');
        el.className = 'cell';
        el.dataset.r = r; el.dataset.c = c;
        if (paint) paint(el, r, c);
        boardEl.appendChild(el);
        cells[r][c] = el;
      }
    }
    return cells;
  }
  // Decorate a cell as a family tile. fam=null => empty.
  function paintTile(el, fam, glyphOverride) {
    el.className = 'cell';
    if (fam == null) { el.classList.add('empty'); el.innerHTML = ''; return; }
    el.classList.add('f-' + fam);
    const g = glyphOverride != null ? glyphOverride : (FAM[fam] ? FAM[fam].g : '?');
    el.innerHTML = '<span class="glyph">' + g + '</span>';
  }

  /* ---- pointer drag-path tracker --------------------------------------
     The cross-device heavy lifting: tracks the ordered list of cells the
     pointer crosses, with backtrack (re-entering the previous cell pops it).
     Each prototype decides what is a *legal* extension via canExtend().

     opts = {
       canExtend(path, r, c, el) -> bool   // may we add cell (r,c) to path?
       onStart(p)  onExtend(p)  onBacktrack(p)  onEnd(p)
     }
     path entries: { r, c, el }. Caller owns interpretation of the path.
  -------------------------------------------------------------------------*/
  function dragPath(boardEl, opts) {
    opts = opts || {};
    let path = [];        // [{r,c,el}]
    let active = false;

    const inPath = (r, c) => path.some(p => p.r === r && p.c === c);
    const cellFromEvent = (ev) => {
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      if (!t) return null;
      const cell = t.closest ? t.closest('.cell') : null;
      if (!cell || !boardEl.contains(cell)) return null;
      if (cell.dataset.r == null) return null;
      return cell;
    };
    const rc = (cell) => ({ r: +cell.dataset.r, c: +cell.dataset.c, el: cell });

    function tryAdd(cell) {
      const { r, c } = rc(cell);
      // backtrack: re-entered the second-to-last cell -> pop the last
      if (path.length >= 2) {
        const prev = path[path.length - 2];
        if (prev.r === r && prev.c === c) {
          path.pop();
          if (opts.onBacktrack) opts.onBacktrack(path);
          return;
        }
      }
      if (inPath(r, c)) return;            // already in path, ignore
      if (opts.canExtend && !opts.canExtend(path, r, c, cell)) return;
      path.push({ r, c, el: cell });
      if (opts.onExtend) opts.onExtend(path);
    }

    function down(ev) {
      const cell = cellFromEvent(ev);
      if (!cell) return;
      ev.preventDefault();
      active = true;
      path = [];
      const { r, c } = rc(cell);
      // start cell must itself be allowed (canExtend called with empty path)
      if (opts.canExtend && !opts.canExtend(path, r, c, cell)) { active = false; return; }
      path.push({ r, c, el: cell });
      if (opts.onStart) opts.onStart(path);
      if (opts.onExtend) opts.onExtend(path);
      try { boardEl.setPointerCapture(ev.pointerId); } catch (e) {}
    }
    function move(ev) {
      if (!active) return;
      const cell = cellFromEvent(ev);
      if (cell) tryAdd(cell);
    }
    function up(ev) {
      if (!active) return;
      active = false;
      const finished = path; path = [];
      if (opts.onEnd) opts.onEnd(finished);
    }

    boardEl.addEventListener('pointerdown', down);
    boardEl.addEventListener('pointermove', move);
    boardEl.addEventListener('pointerup', up);
    boardEl.addEventListener('pointercancel', up);
    // expose teardown if a prototype rebuilds the board
    return { destroy() {
      boardEl.removeEventListener('pointerdown', down);
      boardEl.removeEventListener('pointermove', move);
      boardEl.removeEventListener('pointerup', up);
      boardEl.removeEventListener('pointercancel', up);
    }};
  }

  /* ---- draw the path as an SVG polyline on a .board-overlay ------------- */
  // cells: 2D el array. Returns nothing; clears+redraws overlay each call.
  function drawPathOverlay(overlaySvg, boardEl, path, color) {
    while (overlaySvg.firstChild) overlaySvg.removeChild(overlaySvg.firstChild);
    if (!path || path.length < 1) return;
    // Measure against the SVG's OWN box, not the board. The overlay is position:absolute
    // inset:0 so it fills the board-card (padding + the board's centring margins), which is
    // larger than the board itself — using the board's rect would scale + offset the line.
    // Sizing the viewBox to the SVG's own rendered size makes 1 user unit = 1 CSS pixel and
    // its aspect ratio match exactly (no letterboxing), so cell centres land dead-on.
    const sRect = overlaySvg.getBoundingClientRect();
    overlaySvg.setAttribute('viewBox', `0 0 ${sRect.width} ${sRect.height}`);
    const pts = path.map(p => {
      const r = p.el.getBoundingClientRect();
      return [(r.left + r.width / 2) - sRect.left, (r.top + r.height / 2) - sRect.top];
    });
    const NS = 'http://www.w3.org/2000/svg';
    if (pts.length >= 2) {
      const pl = document.createElementNS(NS, 'polyline');
      pl.setAttribute('points', pts.map(p => p.join(',')).join(' '));
      pl.setAttribute('fill', 'none');
      pl.setAttribute('stroke', color || 'rgba(138,90,43,.85)');
      pl.setAttribute('stroke-width', '8');
      pl.setAttribute('stroke-linejoin', 'round');
      pl.setAttribute('stroke-linecap', 'round');
      overlaySvg.appendChild(pl);
    }
    // node dots
    pts.forEach((p, i) => {
      const d = document.createElementNS(NS, 'circle');
      d.setAttribute('cx', p[0]); d.setAttribute('cy', p[1]);
      d.setAttribute('r', i === 0 ? 7 : 5);
      d.setAttribute('fill', '#fff');
      d.setAttribute('stroke', color || 'rgba(138,90,43,.85)');
      d.setAttribute('stroke-width', '3');
      overlaySvg.appendChild(d);
    });
  }

  /* ---- toast + log ------------------------------------------------------ */
  let toastHost = null;
  function toast(msg, kind) {
    if (!toastHost) { toastHost = document.createElement('div'); toastHost.className = 'toast-host'; document.body.appendChild(toastHost); }
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.textContent = msg;
    toastHost.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 1400);
  }
  function logger(logEl, max) {
    max = max || 40;
    return function (msg, kind) {
      const line = document.createElement('div');
      line.className = 'line' + (kind ? ' ' + kind : '');
      line.textContent = msg;
      logEl.appendChild(line);
      while (logEl.children.length > max) logEl.removeChild(logEl.firstChild);
      logEl.scrollTop = logEl.scrollHeight;
    };
  }

  global.PD = {
    FAM, rng, randInt, choice, clamp, shuffle,
    N4, N8, adj4, adj8,
    renderGrid, paintTile, dragPath, drawPathOverlay,
    toast, logger,
  };
})(window);
