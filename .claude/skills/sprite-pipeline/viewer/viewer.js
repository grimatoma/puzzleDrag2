/* Sprite set review viewer — vanilla JS, no deps.
   Fetches data.json (emitted by build_viewer.mjs, sitting beside index.html), renders one section
   per set with status-badged asset cards (keyframes grouped; idles/transitions show their GIF),
   persists per-asset + page-level comments in localStorage, and copies all comments to the
   clipboard as a paste-ready block. No server, no download. */

(function () {
  "use strict";

  var STORE_PREFIX = "sprite-viewer.comment.";
  var PAGE_KEY = "sprite-viewer.comment.__page__";

  var els = {
    app: document.getElementById("app"),
    loading: document.getElementById("loading"),
    totals: document.getElementById("totals"),
    pageComment: document.getElementById("page-comment"),
    copyBtn: document.getElementById("copy-comments"),
    clearBtn: document.getElementById("clear-comments"),
    copyStatus: document.getElementById("copy-status"),
    count: document.getElementById("comment-count"),
    tpl: document.getElementById("card-tpl"),
  };

  // ── localStorage helpers (degrade gracefully if unavailable) ───────────────────────────────
  function lsGet(key) {
    try {
      return window.localStorage.getItem(key) || "";
    } catch (e) {
      return "";
    }
  }
  function lsSet(key, val) {
    try {
      if (val) window.localStorage.setItem(key, val);
      else window.localStorage.removeItem(key);
    } catch (e) {
      /* ignore quota / disabled storage */
    }
  }
  function commentKey(setName, assetId) {
    return STORE_PREFIX + setName + "::" + assetId;
  }

  // ── small DOM helper ───────────────────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ── comment wiring ───────────────────────────────────────────────────────────────────────
  // Every comment field (page + per-asset) carries data-store-key; one input handler persists +
  // refreshes the counter; the .has-text class highlights non-empty fields.
  function bindComment(field, key) {
    field.dataset.storeKey = key;
    field.value = lsGet(key);
    syncFieldState(field);
    field.addEventListener("input", function () {
      lsSet(key, field.value.trim() ? field.value : "");
      syncFieldState(field);
      refreshCount();
    });
  }
  function syncFieldState(field) {
    if (field.value.trim()) field.classList.add("has-text");
    else field.classList.remove("has-text");
  }

  function refreshCount() {
    var fields = document.querySelectorAll("[data-store-key]");
    var n = 0;
    fields.forEach(function (f) {
      if (f.value.trim()) n += 1;
    });
    els.count.textContent = n + (n === 1 ? " comment" : " comments");
    els.copyBtn.disabled = n === 0;
    els.clearBtn.disabled = n === 0;
  }

  // ── description per asset kind ─────────────────────────────────────────────────────────────
  function describe(asset) {
    if (asset.kind === "keyframe") {
      return asset.prompt || "(no prompt)";
    }
    if (asset.kind === "idle") {
      var f = asset.frames ? asset.frames + "f · " : "";
      return f + (asset.motion || "(no motion note)");
    }
    if (asset.kind === "transition") {
      var ff = asset.frames ? asset.frames + "f · " : "";
      return ff + (asset.physics || "(no physics note)");
    }
    return "";
  }
  function kindLabel(asset) {
    if (asset.kind === "transition") return "transition · " + asset.from + " → " + asset.to;
    if (asset.kind === "idle") return "idle · " + asset.for;
    return "keyframe";
  }

  // ── media (image / animated GIF / pending placeholder) ─────────────────────────────────────
  function fillMedia(mediaEl, asset) {
    mediaEl.innerHTML = "";
    var src = null;
    var animated = false;
    if (asset.kind === "keyframe") {
      src = asset.png;
    } else {
      // idle / transition: prefer the animated GIF; fall back to a poster still if present.
      src = asset.gif || asset.poster || asset.posterFrom || null;
      animated = !!asset.gif;
    }

    if (src) {
      var img = el("img");
      img.src = src;
      img.alt = asset.id;
      img.loading = "lazy";
      mediaEl.appendChild(img);
      if (animated) mediaEl.classList.add("is-anim");
    } else {
      // pending → checkered placeholder showing the id + intended prompt (the checker comes from
      // the .card__media background; we just add the label).
      var ph = el("div", "placeholder");
      ph.appendChild(el("div", "placeholder__mark", "▦"));
      ph.appendChild(el("div", "placeholder__text", "pending"));
      mediaEl.appendChild(ph);
    }
  }

  // ── one card ─────────────────────────────────────────────────────────────────────────────
  function makeCard(setName, asset) {
    var frag = els.tpl.content.cloneNode(true);
    var card = frag.querySelector(".card");
    if (asset.status === "pending") card.classList.add("card--pending");

    fillMedia(card.querySelector(".card__media"), asset);

    card.querySelector(".card__kind").textContent = kindLabel(asset);

    var badge = card.querySelector(".badge");
    badge.textContent = asset.status;
    badge.classList.add("badge--" + asset.status);

    card.querySelector(".card__id").textContent = asset.id;
    card.querySelector(".card__desc").textContent = describe(asset);

    bindComment(card.querySelector(".card__comment"), commentKey(setName, asset.id));
    return card;
  }

  // ── one set section ──────────────────────────────────────────────────────────────────────
  function makeSet(set, index) {
    var section = el("section", "set");
    section.style.animationDelay = Math.min(index * 60, 360) + "ms";

    var head = el("div", "set__head");
    head.appendChild(el("h2", "set__name", set.set));
    if (set.error) {
      head.appendChild(el("span", "set__error", set.error));
    } else if (set.counts) {
      var counts = el("div", "set__counts");
      counts.innerHTML =
        '<span class="c-approved"><b>' +
        set.counts.approved +
        "</b> approved</span>" +
        '<span class="c-generated"><b>' +
        set.counts.generated +
        "</b> generated</span>" +
        '<span class="c-pending"><b>' +
        set.counts.pending +
        "</b> pending</span>";
      head.appendChild(counts);
    }
    section.appendChild(head);

    var assets = set.assets || [];
    if (!assets.length) {
      section.appendChild(el("p", "empty", "No assets declared in this set's manifest."));
      return section;
    }

    var grid = el("div", "grid");
    // Order: keyframes (grouped by their optional `group`, e.g. seasons), then idles, then
    // transitions — so a set reads stills-first, then the animations over them.
    var keyframes = assets.filter(function (a) {
      return a.kind === "keyframe";
    });
    var idles = assets.filter(function (a) {
      return a.kind === "idle";
    });
    var transitions = assets.filter(function (a) {
      return a.kind === "transition";
    });

    appendGroupedKeyframes(grid, set.set, keyframes);
    appendLabeledRun(grid, set.set, idles, idles.length ? "idles" : null);
    appendLabeledRun(grid, set.set, transitions, transitions.length ? "transitions" : null);

    section.appendChild(grid);
    return section;
  }

  // keyframes: if any carry a `group`, emit a label row per group; otherwise a single run.
  function appendGroupedKeyframes(grid, setName, keyframes) {
    if (!keyframes.length) return;
    var hasGroups = keyframes.some(function (k) {
      return k.group;
    });
    if (!hasGroups) {
      appendLabeledRun(grid, setName, keyframes, "keyframes");
      return;
    }
    var groups = {};
    var order = [];
    keyframes.forEach(function (k) {
      var g = k.group || "keyframes";
      if (!groups[g]) {
        groups[g] = [];
        order.push(g);
      }
      groups[g].push(k);
    });
    order.forEach(function (g) {
      appendLabeledRun(grid, setName, groups[g], g);
    });
  }

  function appendLabeledRun(grid, setName, assets, label) {
    if (!assets.length) return;
    if (label) grid.appendChild(el("div", "group-label", label));
    assets.forEach(function (a) {
      grid.appendChild(makeCard(setName, a));
    });
  }

  // ── totals line ──────────────────────────────────────────────────────────────────────────
  function renderTotals(data) {
    var t = data.totals || { total: 0, generated: 0, pending: 0, approved: 0 };
    els.totals.innerHTML =
      "<span><strong>" +
      (data.sets ? data.sets.length : 0) +
      "</strong> sets</span>" +
      "<span><strong>" +
      t.total +
      "</strong> assets</span>" +
      "<span><strong>" +
      t.generated +
      "</strong> generated</span>" +
      "<span><strong>" +
      t.pending +
      "</strong> pending</span>";
  }

  // ── copy comments ────────────────────────────────────────────────────────────────────────
  // Concatenate every non-empty comment, each tagged with set + asset id, into a paste-ready
  // block, and write it to the clipboard. No download, no server.
  function gatherComments() {
    var lines = [];
    var page = (els.pageComment.value || "").trim();
    if (page) {
      lines.push("## Overall");
      lines.push(page);
      lines.push("");
    }
    // Walk sets in render order for stable output.
    var sections = document.querySelectorAll(".set");
    sections.forEach(function (section) {
      var setName = section.querySelector(".set__name")
        ? section.querySelector(".set__name").textContent
        : "";
      var cardLines = [];
      section.querySelectorAll(".card").forEach(function (card) {
        var field = card.querySelector(".card__comment");
        var val = field && field.value ? field.value.trim() : "";
        if (!val) return;
        var id = card.querySelector(".card__id").textContent;
        cardLines.push("- [" + id + "] " + val);
      });
      if (cardLines.length) {
        lines.push("## " + setName);
        lines = lines.concat(cardLines);
        lines.push("");
      }
    });
    return lines.join("\n").trim();
  }

  function flashStatus(msg, isError) {
    els.copyStatus.textContent = msg;
    els.copyStatus.style.color = isError ? "var(--danger)" : "var(--sage)";
    window.clearTimeout(flashStatus._t);
    flashStatus._t = window.setTimeout(function () {
      els.copyStatus.textContent = "";
    }, 2600);
  }

  function copyComments() {
    var text = gatherComments();
    if (!text) {
      flashStatus("nothing to copy", true);
      return;
    }
    var ok = function () {
      flashStatus("copied ✓");
    };
    var fail = function () {
      // last-ditch fallback: select a temp textarea + execCommand (older/insecure contexts).
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var done = document.execCommand("copy");
        document.body.removeChild(ta);
        if (done) ok();
        else flashStatus("copy failed — select manually", true);
      } catch (e) {
        flashStatus("copy failed — select manually", true);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      fail();
    }
  }

  function clearComments() {
    if (!window.confirm("Clear all review comments (per-asset + overall)? This cannot be undone."))
      return;
    document.querySelectorAll("[data-store-key]").forEach(function (f) {
      f.value = "";
      lsSet(f.dataset.storeKey, "");
      syncFieldState(f);
    });
    refreshCount();
    flashStatus("cleared");
  }

  // ── boot ─────────────────────────────────────────────────────────────────────────────────
  function render(data) {
    if (els.loading) els.loading.remove();
    renderTotals(data);

    var sets = data.sets || [];
    if (!sets.length) {
      els.app.appendChild(
        el("p", "empty", "No sets found. Run build_viewer.mjs against a sets/ dir with manifests.")
      );
    } else {
      sets.forEach(function (set, i) {
        els.app.appendChild(makeSet(set, i));
      });
    }

    bindComment(els.pageComment, PAGE_KEY);
    refreshCount();
  }

  function boot() {
    els.copyBtn.addEventListener("click", copyComments);
    els.clearBtn.addEventListener("click", clearComments);

    fetch("data.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        if (els.loading) els.loading.remove();
        var p = el(
          "p",
          "error",
          "Could not load data.json (" +
            err.message +
            "). Build it with build_viewer.mjs and serve this directory over http."
        );
        els.app.appendChild(p);
        // still wire the page-level comment box so notes aren't lost.
        bindComment(els.pageComment, PAGE_KEY);
        refreshCount();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
