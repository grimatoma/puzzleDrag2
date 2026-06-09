/* Sprite set review viewer — vanilla JS, no deps.
   Fetches data.json (emitted by build_viewer.mjs, sitting beside index.html), renders one section
   per ITEM: its keys (master first, then children) as cards with the approved/selected image, a
   collapsed "Candidates (N)" section, and Approve / Select / Regenerate / comment controls; then its
   animations (idle / transition) as GIF cards.

   The controls POST back to a tiny control server on the same origin (/api/select, /api/approve,
   /api/regen, /api/comment). The server is built separately — until it exists the POSTs 404; we
   handle that gracefully (visible "control server not running" note + a localStorage fallback for
   comments) instead of crashing.

   Live-update: poll data.json every ~2s; when `generatedAt` changes, re-render. We also re-poll
   shortly after any successful POST so the UI reflects the change. */

(function () {
  "use strict";

  var STORE_PREFIX = "sprite-viewer.comment.";
  var POLL_MS = 2000;

  var els = {
    app: document.getElementById("app"),
    loading: document.getElementById("loading"),
    totals: document.getElementById("totals"),
    live: document.getElementById("live"),
    banner: document.getElementById("server-banner"),
    itemTpl: document.getElementById("item-tpl"),
    keyTpl: document.getElementById("key-tpl"),
    candTpl: document.getElementById("cand-tpl"),
    animTpl: document.getElementById("anim-tpl"),
  };

  // Mutable view state.
  var lastGeneratedAt = null; // last rendered data.generatedAt — re-render only when it changes
  var lastFetchedAt = 0; // wall-clock of the last successful data.json fetch (for "updated Ns ago")
  var lastTotals = null; // totals from last render (for the live indicator text)
  var pollTimer = null;

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
  function commentKey(itemId, keyId) {
    return STORE_PREFIX + itemId + "::" + keyId;
  }

  // ── small DOM helper ───────────────────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ── control-server POST ──────────────────────────────────────────────────────────────────────
  // POST JSON to /api/<path>. Resolves with the parsed body on 2xx; rejects otherwise. Network
  // failures and non-2xx (incl. 404 when the server isn't running) reject so callers can degrade.
  function apiPost(pathname, body) {
    return fetch("/api/" + pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    }).then(function (r) {
      if (!r.ok) {
        var err = new Error("HTTP " + r.status);
        err.status = r.status;
        throw err;
      }
      return r.json().catch(function () {
        return {};
      });
    });
  }

  function showServerBanner() {
    if (!els.banner) return;
    els.banner.textContent =
      "Control server not running — Approve / Select / Regenerate are inert and comments fall " +
      "back to this browser's local storage. Start it (Task 4: serve_viewer.mjs) to persist " +
      "decisions back to pipeline.json.";
    els.banner.hidden = false;
  }

  // Per-card transient note (success / failure of a control action).
  function setCardNote(noteEl, msg, isError) {
    if (!noteEl) return;
    noteEl.textContent = msg || "";
    noteEl.classList.toggle("is-error", !!isError);
    if (msg) {
      window.clearTimeout(noteEl._t);
      noteEl._t = window.setTimeout(function () {
        noteEl.textContent = "";
        noteEl.classList.remove("is-error");
      }, 3200);
    }
  }

  // ── comment wiring (per-key note box) ────────────────────────────────────────────────────────
  // POST the comment to /api/comment; on failure fall back to localStorage so the note isn't lost.
  function bindComment(field, itemId, keyId, noteEl) {
    var key = commentKey(itemId, keyId);
    field.value = lsGet(key);
    syncFieldState(field);

    var debounce = null;
    field.addEventListener("input", function () {
      syncFieldState(field);
      // Always mirror to localStorage immediately (cheap, survives a missing server).
      lsSet(key, field.value.trim() ? field.value : "");
      // Debounced POST to the control server.
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(function () {
        apiPost("comment", { itemId: itemId, keyId: keyId, comment: field.value }).then(
          function () {
            scheduleRepoll();
          },
          function () {
            // Server down → already persisted to localStorage; surface the fallback once.
            showServerBanner();
          }
        );
      }, 700);
    });
  }
  function syncFieldState(field) {
    if (field.value.trim()) field.classList.add("has-text");
    else field.classList.remove("has-text");
  }

  // ── media (image / animated GIF / placeholder) ─────────────────────────────────────────────
  function fillImage(mediaEl, src, alt, animated) {
    mediaEl.innerHTML = "";
    mediaEl.classList.remove("is-anim");
    if (src) {
      var img = el("img");
      img.src = src;
      img.alt = alt || "";
      img.loading = "lazy";
      mediaEl.appendChild(img);
      if (animated) mediaEl.classList.add("is-anim");
    } else {
      var ph = el("div", "placeholder");
      ph.appendChild(el("div", "placeholder__mark", "▦"));
      ph.appendChild(el("div", "placeholder__text", "no selection yet"));
      mediaEl.appendChild(ph);
    }
  }

  // ── one candidate thumbnail ────────────────────────────────────────────────────────────────
  function makeCandidate(itemId, keyId, cand, isSelected, noteEl) {
    var frag = els.candTpl.content.cloneNode(true);
    var root = frag.querySelector(".cand");
    if (isSelected) root.classList.add("is-selected");
    if (cand.status === "failed" || cand.status === "rejected") root.classList.add("is-rejected");

    var thumb = root.querySelector(".cand__thumb");
    fillImage(thumb, cand.url, keyId + " candidate " + cand.idx, false);

    var check = root.querySelector(".cand__check");
    check.value = String(cand.idx);
    check.dataset.idx = String(cand.idx);

    root.querySelector(".cand__idx").textContent =
      "#" + (cand.idx == null ? "?" : cand.idx) + (isSelected ? " · selected" : "");

    var badge = root.querySelector(".badge--cand");
    badge.textContent = cand.status || "generated";
    badge.classList.add("badge--" + (cand.status || "generated"));

    var llm = root.querySelector(".cand__llm");
    if (cand.llm) {
      llm.textContent = "LLM: " + cand.llm;
      llm.classList.add(cand.llm === "pass" ? "llm--pass" : "llm--fail");
    } else {
      llm.textContent = "LLM: —";
    }

    var reason = root.querySelector(".cand__reason");
    if (cand.reason) reason.textContent = cand.reason;
    else reason.remove();

    var selectBtn = root.querySelector(".select-btn");
    if (isSelected) {
      selectBtn.textContent = "Selected";
      selectBtn.disabled = true;
    }
    selectBtn.addEventListener("click", function () {
      setCardNote(noteEl, "selecting #" + cand.idx + "…", false);
      apiPost("select", { itemId: itemId, keyId: keyId, idx: cand.idx }).then(
        function () {
          setCardNote(noteEl, "selected #" + cand.idx + " ✓", false);
          scheduleRepoll();
        },
        function (err) {
          handleControlFailure(noteEl, err, "select");
        }
      );
    });

    return root;
  }

  // ── one key card (master / child) ──────────────────────────────────────────────────────────
  function makeKeyCard(itemId, key) {
    var frag = els.keyTpl.content.cloneNode(true);
    var card = frag.querySelector(".card");
    var status = key.status || "pending";
    card.classList.add("card--" + status);

    // Approved/selected image full-size (or placeholder).
    fillImage(card.querySelector(".card__media"), key.approvedUrl, key.id, false);

    card.querySelector(".card__role").textContent = key.role || "key";

    var badge = card.querySelector(".badge");
    badge.textContent = status;
    badge.classList.add("badge--" + status);

    card.querySelector(".card__id").textContent = key.id;
    card.querySelector(".card__desc").textContent = key.prompt || "(no prompt)";

    var noteEl = card.querySelector(".card__controls-note");
    var candidates = Array.isArray(key.candidates) ? key.candidates : [];

    // Candidates section (collapsed by default — <details> has no `open`).
    card.querySelector(".cands__n").textContent = String(candidates.length);
    var candGrid = card.querySelector(".cands__grid");
    candidates.forEach(function (c) {
      candGrid.appendChild(makeCandidate(itemId, key.id, c, c.idx === key.selected, noteEl));
    });
    if (!candidates.length) {
      candGrid.appendChild(el("p", "cands__empty", "No candidates generated yet."));
    }

    // Regenerate-selected: enabled only when ≥1 checkbox is ticked.
    var regenBtn = card.querySelector(".regen-btn");
    var checks = candGrid.querySelectorAll(".cand__check");
    function syncRegen() {
      var any = false;
      checks.forEach(function (c) {
        if (c.checked) any = true;
      });
      regenBtn.disabled = !any;
    }
    checks.forEach(function (c) {
      c.addEventListener("change", syncRegen);
    });
    regenBtn.addEventListener("click", function () {
      var idxs = [];
      checks.forEach(function (c) {
        if (c.checked) idxs.push(Number(c.dataset.idx));
      });
      if (!idxs.length) return;
      setCardNote(noteEl, "regenerating " + idxs.length + "…", false);
      apiPost("regen", { itemId: itemId, keyId: key.id, idxs: idxs }).then(
        function () {
          setCardNote(noteEl, "queued regen of [" + idxs.join(", ") + "] ✓", false);
          scheduleRepoll();
        },
        function (err) {
          handleControlFailure(noteEl, err, "regenerate");
        }
      );
    });

    // Approve: locks the currently selected (or chosen) candidate. Disabled when nothing to lock.
    var approveBtn = card.querySelector(".approve-btn");
    var chosenIdx = key.selected;
    if (chosenIdx == null && candidates.length === 1) chosenIdx = candidates[0].idx;
    if (chosenIdx == null) {
      approveBtn.disabled = true;
      approveBtn.title = "Select a candidate first";
    }
    if (status === "approved") {
      approveBtn.textContent = "Approved";
      approveBtn.classList.add("is-on");
    }
    approveBtn.addEventListener("click", function () {
      if (chosenIdx == null) {
        setCardNote(noteEl, "select a candidate first", true);
        return;
      }
      setCardNote(noteEl, "approving #" + chosenIdx + "…", false);
      apiPost("approve", { itemId: itemId, keyId: key.id, idx: chosenIdx }).then(
        function () {
          setCardNote(noteEl, "approved #" + chosenIdx + " ✓", false);
          scheduleRepoll();
        },
        function (err) {
          handleControlFailure(noteEl, err, "approve");
        }
      );
    });

    bindComment(card.querySelector(".card__comment"), itemId, key.id, noteEl);
    return card;
  }

  function handleControlFailure(noteEl, err, verb) {
    var is404 = err && err.status === 404;
    setCardNote(
      noteEl,
      is404
        ? "control server not running — " + verb + " not saved"
        : "could not " + verb + " (" + (err && err.message ? err.message : "network error") + ")",
      true
    );
    showServerBanner();
  }

  // ── one animation card (idle / transition) ─────────────────────────────────────────────────
  function makeAnimCard(anim) {
    var frag = els.animTpl.content.cloneNode(true);
    var card = frag.querySelector(".card");
    var status = anim.status || "pending";
    card.classList.add("card--" + status);

    var poster = anim.posterUrl || anim.posterFromUrl || anim.posterToUrl || null;
    var src = anim.gifUrl || poster || null;
    fillImage(card.querySelector(".card__media"), src, anim.id, !!anim.gifUrl);

    var role;
    if (anim.kind === "transition") role = "transition · " + anim.from + " → " + anim.to;
    else if (anim.kind === "idle") role = "idle · " + anim.for;
    else role = anim.kind || "animation";
    card.querySelector(".card__role").textContent = role;

    var badge = card.querySelector(".badge");
    badge.textContent = status;
    badge.classList.add("badge--" + status);

    card.querySelector(".card__id").textContent = anim.id;

    var bits = [];
    if (anim.frames) bits.push(anim.frames + "f");
    if (anim.motion) bits.push(anim.motion);
    if (anim.physics) bits.push(anim.physics);
    card.querySelector(".card__desc").textContent = bits.length ? bits.join(" · ") : "(no notes)";

    return card;
  }

  // ── one item section ───────────────────────────────────────────────────────────────────────
  function makeItem(item, index) {
    var frag = els.itemTpl.content.cloneNode(true);
    var section = frag.querySelector(".item");
    section.style.animationDelay = Math.min(index * 70, 420) + "ms";

    section.querySelector(".item__id").textContent = item.id || "(unnamed item)";
    section.querySelector(".item__prompt").textContent = item.basePrompt || "";

    var keysWrap = section.querySelector(".item__keys");
    var keys = Array.isArray(item.keys) ? item.keys : [];
    // master first, then children — but render in the order given (build already orders master-first).
    keys.forEach(function (k) {
      keysWrap.appendChild(makeKeyCard(item.id, k));
    });
    if (!keys.length) {
      keysWrap.appendChild(el("p", "empty", "No keys declared for this item."));
    }

    var animsWrap = section.querySelector(".item__anims");
    var anims = Array.isArray(item.animations) ? item.animations : [];
    if (anims.length) {
      animsWrap.appendChild(el("div", "group-label", "animations"));
      var grid = el("div", "grid grid--anim");
      anims.forEach(function (a) {
        grid.appendChild(makeAnimCard(a));
      });
      animsWrap.appendChild(grid);
    }

    return section;
  }

  // ── totals + live indicator ────────────────────────────────────────────────────────────────
  function renderTotals(data) {
    var t = data.totals || { items: 0, keyframes: 0, animations: 0, approved: 0, pending: 0 };
    lastTotals = t;
    els.totals.innerHTML =
      "<span><strong>" +
      (data.items ? data.items.length : 0) +
      "</strong> items</span>" +
      "<span><strong>" +
      (t.keyframes || 0) +
      "</strong> keys</span>" +
      "<span><strong>" +
      (t.animations || 0) +
      "</strong> anims</span>";
    updateLive();
  }

  function updateLive() {
    if (!els.live || !lastTotals) return;
    var secs = lastFetchedAt ? Math.max(0, Math.round((Date.now() - lastFetchedAt) / 1000)) : 0;
    var ago = secs < 1 ? "just now" : secs + "s ago";
    els.live.textContent =
      "updated " +
      ago +
      " · " +
      (lastTotals.approved || 0) +
      " approved / " +
      (lastTotals.pending || 0) +
      " pending";
  }

  // ── render (only when generatedAt changed) ─────────────────────────────────────────────────
  function render(data) {
    if (els.loading) els.loading.remove();
    // Clear any prior render (keep nothing — the items wrapper IS #app's children).
    els.app.innerHTML = "";

    renderTotals(data);

    var items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      els.app.appendChild(
        el("p", "empty", "No items found. Run build_viewer.mjs against pipeline.json.")
      );
      return;
    }
    items.forEach(function (item, i) {
      els.app.appendChild(makeItem(item, i));
    });
  }

  // ── polling ────────────────────────────────────────────────────────────────────────────────
  function fetchData() {
    return fetch("data.json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function poll() {
    fetchData().then(
      function (data) {
        lastFetchedAt = Date.now();
        if (data.generatedAt !== lastGeneratedAt) {
          lastGeneratedAt = data.generatedAt;
          render(data);
        } else {
          // No content change — just refresh the "updated Ns ago" text.
          updateLive();
        }
      },
      function () {
        // Transient fetch failure during polling: leave the current view; live text keeps aging.
        updateLive();
      }
    );
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = window.setInterval(poll, POLL_MS);
  }

  // After a successful control POST, re-poll soon so the UI reflects the server's mutation without
  // waiting for the next interval tick.
  function scheduleRepoll() {
    window.setTimeout(poll, 250);
  }

  // ── boot ─────────────────────────────────────────────────────────────────────────────────
  function boot() {
    fetchData().then(
      function (data) {
        lastFetchedAt = Date.now();
        lastGeneratedAt = data.generatedAt;
        render(data);
        startPolling();
      },
      function (err) {
        if (els.loading) els.loading.remove();
        els.app.appendChild(
          el(
            "p",
            "error",
            "Could not load data.json (" +
              err.message +
              "). Build it with build_viewer.mjs and serve this directory over http."
          )
        );
        // Keep retrying — the file may appear once a build runs.
        startPolling();
      }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
