/* Sprite set review viewer — vanilla JS, no deps.
   Fetches data.json (emitted by build_viewer.mjs, sitting beside index.html), renders one section
   per ITEM: its keys (master first, then children) as cards with the approved/selected image, a
   collapsed "Candidates (N)" section, and Approve / Select / Regenerate / Reject-all / comment / edit
   controls; then its animations (idle / transition) as GIF cards with Reject / comment / a frame
   scrubber. The point: a human can drive the WHOLE review from the browser — approve a candidate,
   reject a pool, leave feedback, then resume the run — without switching to the terminal.

   The controls POST back to a tiny control server on the same origin (/api/{select,approve,regen,
   comment,reject-all,prompt,resume,anim-reject,anim-comment}; GET /api/health for liveness). When no
   control server is reachable (a published static snapshot) we enter a calm read-only mode: write
   controls are disabled, comments fall back to localStorage, no alarming red error.

   Live-update: poll data.json every ~2s; when `generatedAt` changes, re-render WITHOUT blowing away
   the user's place — open candidate sections, the field they're typing in (+ caret), the scroll
   position, and any open zoom overlay all survive the refresh. */

(function () {
  "use strict";

  var STORE_PREFIX = "sprite-viewer.comment.";
  var POLL_MS = 2000;

  var els = {
    app: document.getElementById("app"),
    loading: document.getElementById("loading"),
    totals: document.getElementById("totals"),
    live: document.getElementById("live"),
    boundTo: document.getElementById("bound-to"),
    banner: document.getElementById("server-banner"),
    runBanner: document.getElementById("run-banner"),
    readonlyNote: document.getElementById("readonly-note"),
    resumeBar: document.getElementById("resume-bar"),
    resumeBtn: document.querySelector("#resume-bar .resume-btn"),
    resumeDetail: document.querySelector("#resume-bar .resume-bar__detail"),
    resumeNote: document.querySelector("#resume-bar .resume-bar__note"),
    zoom: document.getElementById("zoom"),
    zoomCaption: document.querySelector("#zoom .zoom__caption"),
    zoomBig: document.querySelector("#zoom .zoom__big"),
    zoomTile: document.querySelector("#zoom .zoom__tile"),
    zoomClose: document.querySelector("#zoom .zoom__close"),
    itemTpl: document.getElementById("item-tpl"),
    priorTpl: document.getElementById("prior-tpl"),
    keyTpl: document.getElementById("key-tpl"),
    candTpl: document.getElementById("cand-tpl"),
    animTpl: document.getElementById("anim-tpl"),
  };

  // Mutable view state.
  var lastGeneratedAt = null; // last rendered data.generatedAt — re-render only when it changes
  var lastFetchedAt = 0; // wall-clock of the last successful data.json fetch (for "updated Ns ago")
  var lastTotals = null; // totals from last render (for the live indicator text)
  var pollTimer = null;
  var serverMode = "unknown"; // "live" (control server up) | "readonly" (no server) | "unknown"

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
  function commentKey(itemId, scopeId) {
    return STORE_PREFIX + itemId + "::" + scopeId;
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
    // In a known read-only snapshot the calm note already explains it — don't alarm.
    if (serverMode === "readonly") return;
    if (!els.banner) return;
    els.banner.textContent =
      "Control server not reachable — decisions won't be saved. Start it with " +
      "`npm run pixelgen:serve` (comments fall back to this browser's local storage).";
    els.banner.hidden = false;
  }

  // Enter read-only mode: hide destructive affordances, drop a calm note (not the red error). Idempotent.
  function enterReadonly() {
    if (serverMode === "readonly") return;
    serverMode = "readonly";
    document.body.classList.add("is-readonly");
    if (els.readonlyNote) els.readonlyNote.hidden = false;
    if (els.banner) els.banner.hidden = true; // supersede any prior alarming banner
  }
  function enterLive(health) {
    serverMode = "live";
    document.body.classList.remove("is-readonly");
    if (els.readonlyNote) els.readonlyNote.hidden = true;
    if (els.boundTo && health && health.pipelinePath) {
      els.boundTo.hidden = false;
      els.boundTo.title = health.pipelinePath;
      // Abbreviate to the last couple of path segments so the header stays tidy.
      var parts = String(health.pipelinePath).split(/[\\/]/).filter(Boolean);
      var short = parts.slice(-3).join("/");
      els.boundTo.textContent = "bound to …/" + short + " · :" + (health.port || "?");
    }
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

  function handleControlFailure(noteEl, err, verb) {
    var is404 = err && err.status === 404;
    if (is404) enterReadonly();
    setCardNote(
      noteEl,
      is404
        ? "no control server — " + verb + " not saved"
        : "could not " + verb + " (" + (err && err.message ? err.message : "network error") + ")",
      true
    );
    showServerBanner();
  }

  // ── comment wiring (per-key / per-anim note box) ───────────────────────────────────────────────
  // Source of truth is the SERVER value (key.comment / anim.comment), so a comment saved to
  // pipeline.json shows on any browser. We seed from `serverValue` when present, else localStorage.
  // On input we debounce-POST to the given endpoint AND mirror to localStorage for offline safety.
  function bindComment(field, opts) {
    // opts: { itemId, scopeId, serverValue, endpoint, payload(text)->obj, noteEl }
    var lkey = commentKey(opts.itemId, opts.scopeId);
    var hasServer = typeof opts.serverValue === "string" && opts.serverValue.length > 0;
    field.value = hasServer ? opts.serverValue : lsGet(lkey);
    syncFieldState(field);

    var debounce = null;
    field.addEventListener("input", function () {
      syncFieldState(field);
      lsSet(lkey, field.value.trim() ? field.value : "");
      if (serverMode === "readonly") return; // no server → localStorage only
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(function () {
        apiPost(opts.endpoint, opts.payload(field.value)).then(
          function () {
            scheduleRepoll();
          },
          function (err) {
            if (err && err.status === 404) enterReadonly();
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

  // Wire a media element so clicking / Enter opens the zoom overlay. `getInfo()` returns the zoom
  // descriptor lazily (so it always reflects the current src, e.g. a scrubbed frame).
  function makeZoomable(mediaEl, getInfo) {
    function open() {
      var info = getInfo();
      if (info && info.src) openZoom(info);
    }
    mediaEl.addEventListener("click", open);
    mediaEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  }

  // ── zoom overlay (large integer-zoom sprite + a 3×3 board-tiled preview) ─────────────────────
  function openZoom(info) {
    // info: { src, animated, caption, scale }
    var scale = info.scale || 7;
    els.zoomCaption.textContent = info.caption || "";

    els.zoomBig.innerHTML = "";
    var big = el("img", "zoom__img");
    big.src = info.src;
    big.alt = info.caption || "";
    big.style.transform = "scale(" + scale + ")";
    els.zoomBig.appendChild(big);

    // 3×3 grid of the same sprite at "game scale" (a small fixed cell), so it reads as it would on a
    // board next to itself.
    els.zoomTile.innerHTML = "";
    var grid = el("div", "zoom__grid");
    for (var i = 0; i < 9; i++) {
      var cell = el("div", "zoom__cell");
      var tImg = el("img");
      tImg.src = info.src;
      tImg.alt = "";
      cell.appendChild(tImg);
      grid.appendChild(cell);
    }
    els.zoomTile.appendChild(grid);

    els.zoom.hidden = false;
    document.body.classList.add("zoom-open");
    // Focus the close button for keyboard accessibility.
    if (els.zoomClose) els.zoomClose.focus();
  }
  function closeZoom() {
    els.zoom.hidden = true;
    document.body.classList.remove("zoom-open");
  }
  // Wire overlay dismissal once (backdrop, close buttons, Esc).
  (function wireZoom() {
    if (!els.zoom) return;
    els.zoom.addEventListener("click", function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-zoom-close")) closeZoom();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !els.zoom.hidden) closeZoom();
    });
  })();

  // ── one candidate thumbnail ────────────────────────────────────────────────────────────────
  function makeCandidate(itemId, keyId, cand, isSelected, noteEl) {
    var frag = els.candTpl.content.cloneNode(true);
    var root = frag.querySelector(".cand");
    if (isSelected) root.classList.add("is-selected");
    if (cand.status === "failed" || cand.status === "rejected") root.classList.add("is-rejected");

    var thumb = root.querySelector(".cand__thumb");
    fillImage(thumb, cand.url, keyId + " candidate " + cand.idx, false);
    if (cand.url) {
      makeZoomable(thumb, function () {
        return { src: cand.url, animated: false, caption: keyId + " · candidate #" + cand.idx, scale: 7 };
      });
    }

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

    // Approve THIS candidate in one click (the primary per-candidate action).
    var approveBtn = root.querySelector(".cand-approve-btn");
    if (cand.idx == null || cand.url == null) {
      approveBtn.disabled = true;
      approveBtn.title = "no image to approve";
    }
    approveBtn.addEventListener("click", function () {
      setCardNote(noteEl, "approving #" + cand.idx + "…", false);
      apiPost("approve", { itemId: itemId, keyId: keyId, idx: cand.idx }).then(
        function () {
          setCardNote(noteEl, "approved #" + cand.idx + " ✓", false);
          scheduleRepoll();
        },
        function (err) {
          handleControlFailure(noteEl, err, "approve");
        }
      );
    });

    // Select (without approving) — still useful to mark a preference.
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

  // Does a keyframe need the human? review (candidates exist, none picked) OR pending feedback OR
  // pending while the run is paused for review.
  function keyNeedsYou(key, awaiting) {
    if (key.status === "review") return true;
    if (key.comment && String(key.comment).trim()) return true;
    if (awaiting && key.status === "pending") return true;
    return false;
  }
  function animNeedsYou(anim) {
    if (anim.status === "rejected") return true;
    if (anim.comment && String(anim.comment).trim()) return true;
    return false;
  }

  // ── one key card (master / child) ──────────────────────────────────────────────────────────
  function makeKeyCard(itemId, key, awaiting) {
    var frag = els.keyTpl.content.cloneNode(true);
    var card = frag.querySelector(".card");
    var status = key.status || "pending";
    card.classList.add("card--" + status);
    card.dataset.detailsKey = itemId + "::" + key.id;

    var needs = keyNeedsYou(key, awaiting);
    if (needs) card.classList.add("needs-you");

    // Approved/selected image full-size (or placeholder) — zoomable.
    var media = card.querySelector(".card__media");
    fillImage(media, key.approvedUrl, key.id, false);
    if (key.approvedUrl) {
      makeZoomable(media, function () {
        return { src: key.approvedUrl, animated: false, caption: key.id + " · " + status, scale: 7 };
      });
    }

    card.querySelector(".card__role").textContent = key.role || "key";

    var badge = card.querySelector(".badge");
    badge.textContent = status;
    badge.classList.add("badge--" + status);

    // "feedback pending" chip when a comment is awaiting the agent.
    var chip = card.querySelector(".chip--pending");
    if (key.comment && String(key.comment).trim()) chip.hidden = false;

    card.querySelector(".card__id").textContent = key.id;

    // Editable prompt.
    var desc = card.querySelector(".card__desc");
    desc.textContent = key.prompt || "(no prompt)";
    var noteEl = card.querySelector(".card__controls-note");
    wirePromptEdit(card, itemId, key, noteEl);

    var candidates = Array.isArray(key.candidates) ? key.candidates : [];

    // Candidates section. Auto-expand when this key is awaiting a human pick (don't hide the main task).
    var details = card.querySelector(".cands");
    if (status === "review" && awaiting) details.open = true;
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

    // Approve (the selected / sole candidate). Disabled when nothing to lock.
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

    // Reject all candidates (discard the whole pool → gap-fill re-seeds). Confirm-on-click.
    var rejectAllBtn = card.querySelector(".rejectall-btn");
    if (!candidates.length) {
      rejectAllBtn.disabled = true;
      rejectAllBtn.title = "no candidates to reject";
    }
    var rejArmed = false;
    rejectAllBtn.addEventListener("click", function () {
      if (!rejArmed) {
        rejArmed = true;
        rejectAllBtn.textContent = "Click again to confirm";
        rejectAllBtn.classList.add("is-armed");
        window.clearTimeout(rejectAllBtn._t);
        rejectAllBtn._t = window.setTimeout(function () {
          rejArmed = false;
          rejectAllBtn.textContent = "Reject all";
          rejectAllBtn.classList.remove("is-armed");
        }, 3500);
        return;
      }
      window.clearTimeout(rejectAllBtn._t);
      rejArmed = false;
      rejectAllBtn.textContent = "Reject all";
      rejectAllBtn.classList.remove("is-armed");
      setCardNote(noteEl, "rejecting all…", false);
      apiPost("reject-all", {
        itemId: itemId,
        keyId: key.id,
        reason: "human: rejected all candidates",
      }).then(
        function () {
          setCardNote(noteEl, "rejected all ✓ — will regenerate", false);
          scheduleRepoll();
        },
        function (err) {
          handleControlFailure(noteEl, err, "reject all");
        }
      );
    });

    bindComment(card.querySelector(".card__comment"), {
      itemId: itemId,
      scopeId: key.id,
      serverValue: key.comment,
      endpoint: "comment",
      payload: function (text) {
        return { itemId: itemId, keyId: key.id, comment: text };
      },
      noteEl: noteEl,
    });
    return card;
  }

  // Editable keyframe prompt: an "edit" affordance swaps the <p> for a textarea + save/cancel; save
  // POSTs /api/prompt. The projection MERGES basePrompt+ownPrompt into `prompt`, so the saved text
  // REPLACES the per-key prompt — the tooltip says so.
  function wirePromptEdit(card, itemId, key, noteEl) {
    var wrap = card.querySelector(".card__desc-wrap");
    var desc = card.querySelector(".card__desc");
    var editBtn = card.querySelector(".card__desc-edit");
    if (!wrap || !editBtn) return;
    editBtn.title = "Edit — replaces this keyframe's own prompt";
    editBtn.addEventListener("click", function () {
      if (wrap.querySelector(".prompt-editor")) return; // already editing
      var editor = el("div", "prompt-editor");
      var ta = el("textarea", "comment prompt-editor__field");
      ta.rows = 4;
      ta.value = key.prompt || "";
      ta.title = "Saving replaces this keyframe's per-key prompt.";
      var row = el("div", "prompt-editor__row");
      var save = el("button", "btn btn--primary btn--xs", "Save prompt");
      var cancel = el("button", "btn btn--ghost btn--xs", "Cancel");
      save.type = "button";
      cancel.type = "button";
      row.appendChild(save);
      row.appendChild(cancel);
      editor.appendChild(ta);
      editor.appendChild(row);
      desc.hidden = true;
      editBtn.hidden = true;
      wrap.appendChild(editor);
      ta.focus();

      function done() {
        editor.remove();
        desc.hidden = false;
        editBtn.hidden = false;
      }
      cancel.addEventListener("click", done);
      save.addEventListener("click", function () {
        var text = ta.value;
        setCardNote(noteEl, "saving prompt…", false);
        apiPost("prompt", { itemId: itemId, keyId: key.id, prompt: text }).then(
          function () {
            setCardNote(noteEl, "prompt saved ✓", false);
            desc.textContent = text || "(no prompt)";
            done();
            scheduleRepoll();
          },
          function (err) {
            handleControlFailure(noteEl, err, "save prompt");
          }
        );
      });
    });
  }

  // ── one animation card (idle / transition) ─────────────────────────────────────────────────
  function makeAnimCard(itemId, anim) {
    var frag = els.animTpl.content.cloneNode(true);
    var card = frag.querySelector(".card");
    var status = anim.status || "pending";
    card.classList.add("card--" + status);

    if (animNeedsYou(anim)) card.classList.add("needs-you");

    var poster = anim.posterUrl || anim.posterFromUrl || anim.posterToUrl || null;
    var gifSrc = anim.gifUrl || null;
    var media = card.querySelector(".card__media");
    fillImage(media, gifSrc || poster, anim.id, !!gifSrc);

    var frameUrls = Array.isArray(anim.frameUrls) ? anim.frameUrls : [];
    // Zoom: show whatever is currently displayed (gif, or a scrubbed still).
    makeZoomable(media, function () {
      var imgNow = media.querySelector("img");
      var src = imgNow ? imgNow.getAttribute("src") : gifSrc || poster;
      var isGif = imgNow ? media.classList.contains("is-anim") : !!gifSrc;
      return { src: src, animated: isGif, caption: anim.id, scale: 6 };
    });

    // Frame scrubber (only when per-frame PNGs exist).
    var scrub = card.querySelector(".anim__scrub");
    if (frameUrls.length > 0 && gifSrc) {
      scrub.hidden = false;
      var range = scrub.querySelector(".anim__range");
      var playBtn = scrub.querySelector(".anim__play");
      var frameIdx = scrub.querySelector(".anim__frameidx");
      range.max = String(frameUrls.length - 1);
      range.value = "0";
      function showFrame(i) {
        i = Math.max(0, Math.min(frameUrls.length - 1, i | 0));
        fillImage(media, frameUrls[i], anim.id + " frame " + i, false);
        // re-zoomability: media's img changed; makeZoomable reads it live, so nothing to rewire.
        frameIdx.textContent = i + 1 + " / " + frameUrls.length;
        playBtn.classList.remove("is-on");
      }
      function playGif() {
        fillImage(media, gifSrc, anim.id, true);
        frameIdx.textContent = "playing";
        playBtn.classList.add("is-on");
      }
      range.addEventListener("input", function () {
        showFrame(Number(range.value));
      });
      playBtn.addEventListener("click", function () {
        // toggle: if currently a still, play; else jump to current frame.
        if (media.classList.contains("is-anim")) showFrame(Number(range.value));
        else playGif();
      });
      frameIdx.textContent = "playing";
      playBtn.classList.add("is-on");
    }

    var role;
    if (anim.kind === "transition") role = "transition · " + anim.from + " → " + anim.to;
    else if (anim.kind === "idle") role = "idle · " + anim.for;
    else role = anim.kind || "animation";
    card.querySelector(".card__role").textContent = role;

    var badge = card.querySelector(".badge");
    badge.textContent = status;
    badge.classList.add("badge--" + status);

    var chip = card.querySelector(".chip--pending");
    if (anim.comment && String(anim.comment).trim()) chip.hidden = false;

    card.querySelector(".card__id").textContent = anim.id;

    var bits = [];
    if (anim.frames) bits.push(anim.frames + "f");
    if (anim.motion) bits.push(anim.motion);
    if (anim.physics) bits.push(anim.physics);
    card.querySelector(".card__desc").textContent = bits.length ? bits.join(" · ") : "(no notes)";

    var noteEl = card.querySelector(".card__controls-note");

    // Reject the built animation → planner re-animates it.
    var rejectBtn = card.querySelector(".anim-reject-btn");
    if (status === "rejected") {
      rejectBtn.textContent = "Rejected";
      rejectBtn.classList.add("is-on");
    }
    rejectBtn.addEventListener("click", function () {
      setCardNote(noteEl, "rejecting…", false);
      apiPost("anim-reject", { itemId: itemId, animId: anim.id }).then(
        function () {
          setCardNote(noteEl, "rejected ✓ — will redo", false);
          scheduleRepoll();
        },
        function (err) {
          handleControlFailure(noteEl, err, "reject");
        }
      );
    });

    bindComment(card.querySelector(".anim__comment"), {
      itemId: itemId,
      scopeId: anim.id,
      serverValue: anim.comment,
      endpoint: "anim-comment",
      payload: function (text) {
        return { itemId: itemId, animId: anim.id, comment: text };
      },
      noteEl: noteEl,
    });

    return card;
  }

  // ── one item section ───────────────────────────────────────────────────────────────────────
  function makeItem(item, index, awaiting) {
    var frag = els.itemTpl.content.cloneNode(true);
    var section = frag.querySelector(".item");
    section.style.animationDelay = Math.min(index * 70, 420) + "ms";

    section.querySelector(".item__id").textContent = item.id || "(unnamed item)";
    section.querySelector(".item__prompt").textContent = item.basePrompt || "";

    // Priors strip (family reference art), pinned in the header.
    var priors = Array.isArray(item.priors) ? item.priors : [];
    var priorsWrap = section.querySelector(".priors");
    if (priors.length) {
      priorsWrap.hidden = false;
      var strip = priorsWrap.querySelector(".priors__strip");
      priors.forEach(function (p) {
        strip.appendChild(makePrior(p));
      });
    }

    var keysWrap = section.querySelector(".item__keys");
    var keys = Array.isArray(item.keys) ? item.keys : [];
    // When awaiting, float needs-you keys to the front (stable); otherwise keep declaration order.
    var orderedKeys = keys;
    if (awaiting) {
      orderedKeys = keys
        .map(function (k, i) {
          return { k: k, i: i };
        })
        .sort(function (a, b) {
          var an = keyNeedsYou(a.k, awaiting) ? 0 : 1;
          var bn = keyNeedsYou(b.k, awaiting) ? 0 : 1;
          return an - bn || a.i - b.i;
        })
        .map(function (x) {
          return x.k;
        });
    }
    orderedKeys.forEach(function (k) {
      keysWrap.appendChild(makeKeyCard(item.id, k, awaiting));
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
        grid.appendChild(makeAnimCard(item.id, a));
      });
      animsWrap.appendChild(grid);
    }

    return section;
  }

  function makePrior(p) {
    var frag = els.priorTpl.content.cloneNode(true);
    var root = frag.querySelector(".prior");
    var name = (p.path || "").split("/").pop() || p.path || "prior";
    root.title = p.path || name;
    root.querySelector(".prior__name").textContent = name;
    var thumb = root.querySelector(".prior__thumb");
    fillImage(thumb, p.url, name, false);
    if (p.url) {
      root.addEventListener("click", function () {
        openZoom({ src: p.url, animated: false, caption: "prior · " + (p.path || name), scale: 7 });
      });
    } else {
      root.disabled = true;
      root.classList.add("is-missing");
    }
    return root;
  }

  // ── run-state banner + resume bar ────────────────────────────────────────────────────────────
  function renderRunBanner(data) {
    var rs = data.runState;
    if (!rs || typeof rs !== "object") {
      els.runBanner.hidden = true;
      return;
    }
    var status = String(rs.status || "idle");
    var icon =
      status === "running" ? "⏳" : status === "waiting" ? "⏸" : status === "done" ? "✓" : "•";
    var label =
      status === "running"
        ? "running"
        : status === "waiting"
          ? "waiting"
          : status === "done"
            ? "done"
            : "idle";
    var detail = rs.detail ? " · " + rs.detail : "";
    els.runBanner.hidden = false;
    els.runBanner.className = "run-banner run-banner--" + status;
    els.runBanner.textContent = icon + " " + label + detail;
  }

  function renderResumeBar(data, needsCount) {
    var awaiting = !!data.awaitingHuman;
    if (!awaiting) {
      els.resumeBar.hidden = true;
      document.body.classList.remove("has-resume-bar");
      return;
    }
    els.resumeBar.hidden = false;
    document.body.classList.add("has-resume-bar");
    var n = needsCount || 0;
    els.resumeDetail.textContent =
      (n > 0 ? n + (n === 1 ? " card needs you. " : " cards need you. ") : "") +
      "Review the highlighted cards, then resume.";
    // In read-only mode, the resume button can't do anything — disable it.
    els.resumeBtn.disabled = serverMode === "readonly";
  }

  (function wireResume() {
    if (!els.resumeBtn) return;
    els.resumeBtn.addEventListener("click", function () {
      els.resumeBtn.disabled = true;
      if (els.resumeNote) els.resumeNote.textContent = "resuming…";
      apiPost("resume", {}).then(
        function () {
          if (els.resumeNote) els.resumeNote.textContent = "resume sent ✓";
          scheduleRepoll();
        },
        function (err) {
          els.resumeBtn.disabled = false;
          if (err && err.status === 404) enterReadonly();
          if (els.resumeNote) els.resumeNote.textContent = "could not resume — no server";
          showServerBanner();
        }
      );
    });
  })();

  // ── totals + live indicator ────────────────────────────────────────────────────────────────
  function renderTotals(data, needsCount) {
    var t = data.totals || { items: 0, keyframes: 0, animations: 0, approved: 0, pending: 0 };
    lastTotals = t;
    var html =
      "<span><strong>" +
      (data.items ? data.items.length : 0) +
      "</strong> items</span>" +
      "<span><strong>" +
      (t.keyframes || 0) +
      "</strong> keys</span>" +
      "<span><strong>" +
      (t.animations || 0) +
      "</strong> anims</span>";
    if (needsCount > 0) {
      html += "<span class='totals__needs'><strong>" + needsCount + "</strong> need you</span>";
    }
    els.totals.innerHTML = html;
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

  // Count cards needing the human across the whole dataset (for the header + resume bar).
  function countNeedsYou(data, awaiting) {
    var n = 0;
    var items = Array.isArray(data.items) ? data.items : [];
    items.forEach(function (item) {
      (Array.isArray(item.keys) ? item.keys : []).forEach(function (k) {
        if (keyNeedsYou(k, awaiting)) n += 1;
      });
      (Array.isArray(item.animations) ? item.animations : []).forEach(function (a) {
        if (animNeedsYou(a)) n += 1;
      });
    });
    return n;
  }

  // ── stable re-render: snapshot UI volatiles, rebuild, restore them ──────────────────────────
  function snapshotUi() {
    var snap = { openDetails: {}, field: null, scrollY: window.scrollY || window.pageYOffset || 0 };
    // Open candidate sections, keyed by card.dataset.detailsKey.
    els.app.querySelectorAll(".card[data-details-key] .cands").forEach(function (d) {
      if (d.open) {
        var card = d.closest(".card");
        if (card && card.dataset.detailsKey) snap.openDetails[card.dataset.detailsKey] = true;
      }
    });
    // The field the user is currently typing in (comment / prompt editor), keyed by a stable id.
    var active = document.activeElement;
    if (
      active &&
      (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
      els.app.contains(active)
    ) {
      var fkey = fieldKey(active);
      if (fkey) {
        snap.field = {
          key: fkey,
          start: active.selectionStart,
          end: active.selectionEnd,
        };
      }
    }
    return snap;
  }

  // A stable key for a focusable field so we can refocus the SAME logical field after a rebuild.
  // Comments: card detailsKey + "::comment". Anim comments: anim id + "::anim-comment".
  function fieldKey(node) {
    if (node.classList.contains("card__comment")) {
      var card = node.closest(".card[data-details-key]");
      if (card) return card.dataset.detailsKey + "::comment";
    }
    if (node.classList.contains("anim__comment")) {
      var animCard = node.closest(".card--anim");
      var idEl = animCard && animCard.querySelector(".card__id");
      if (idEl) return "anim::" + idEl.textContent + "::comment";
    }
    // Prompt editor / scrubber range are transient — not restored across rebuilds (acceptable).
    return null;
  }

  function findFieldByKey(key) {
    var parts = key.split("::");
    if (key.indexOf("anim::") === 0) {
      // anim::<animId>::comment
      var animId = parts[1];
      var cards = els.app.querySelectorAll(".card--anim");
      for (var i = 0; i < cards.length; i++) {
        var idEl = cards[i].querySelector(".card__id");
        if (idEl && idEl.textContent === animId) {
          return cards[i].querySelector(".anim__comment");
        }
      }
      return null;
    }
    // <itemId>::<keyId>::comment
    var detailsKey = parts[0] + "::" + parts[1];
    var card = els.app.querySelector('.card[data-details-key="' + cssEsc(detailsKey) + '"]');
    return card ? card.querySelector(".card__comment") : null;
  }

  function cssEsc(s) {
    if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
    return String(s).replace(/["\\]/g, "\\$&");
  }

  function restoreUi(snap) {
    // Reopen candidate sections.
    Object.keys(snap.openDetails).forEach(function (dk) {
      var card = els.app.querySelector('.card[data-details-key="' + cssEsc(dk) + '"]');
      if (card) {
        var d = card.querySelector(".cands");
        if (d) d.open = true;
      }
    });
    // Refocus the field + restore caret.
    if (snap.field) {
      var field = findFieldByKey(snap.field.key);
      if (field) {
        field.focus();
        try {
          var len = field.value.length;
          var s = snap.field.start == null ? len : Math.min(snap.field.start, len);
          var e = snap.field.end == null ? len : Math.min(snap.field.end, len);
          field.setSelectionRange(s, e);
        } catch (err) {
          /* setSelectionRange unsupported on this field type — ignore */
        }
      }
    }
    // Restore scroll position.
    window.scrollTo(0, snap.scrollY);
  }

  // ── render (only when generatedAt changed) ─────────────────────────────────────────────────
  function render(data) {
    if (els.loading) els.loading.remove();

    var awaiting = !!data.awaitingHuman;
    var needsCount = countNeedsYou(data, awaiting);

    renderRunBanner(data);
    renderTotals(data, needsCount);
    renderResumeBar(data, needsCount);

    var snap = snapshotUi();
    els.app.innerHTML = "";

    var items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      els.app.appendChild(
        el("p", "empty", "No items found. Run build_viewer.mjs against pipeline.json.")
      );
      restoreUi(snap);
      return;
    }

    // When awaiting, float items containing needs-you cards to the top (stable); else declaration order.
    var ordered = items;
    if (awaiting) {
      ordered = items
        .map(function (item, i) {
          return { item: item, i: i };
        })
        .sort(function (a, b) {
          var an = itemHasNeeds(a.item, awaiting) ? 0 : 1;
          var bn = itemHasNeeds(b.item, awaiting) ? 0 : 1;
          return an - bn || a.i - b.i;
        })
        .map(function (x) {
          return x.item;
        });
    }
    ordered.forEach(function (item, i) {
      els.app.appendChild(makeItem(item, i, awaiting));
    });

    restoreUi(snap);
  }

  function itemHasNeeds(item, awaiting) {
    var keys = Array.isArray(item.keys) ? item.keys : [];
    for (var i = 0; i < keys.length; i++) if (keyNeedsYou(keys[i], awaiting)) return true;
    var anims = Array.isArray(item.animations) ? item.animations : [];
    for (var j = 0; j < anims.length; j++) if (animNeedsYou(anims[j])) return true;
    return false;
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
          // No content change — refresh the "updated Ns ago" text + the resume bar's live state.
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

  // ── health check (which checkout? control server present?) ─────────────────────────────────────
  function checkHealth() {
    return fetch("/api/health", { cache: "no-store" }).then(
      function (r) {
        if (!r.ok) {
          enterReadonly();
          return;
        }
        return r.json().then(
          function (h) {
            if (h && h.ok) enterLive(h);
            else enterReadonly();
          },
          function () {
            enterLive(null);
          }
        );
      },
      function () {
        // Network error / no server — calm read-only mode.
        enterReadonly();
      }
    );
  }

  // ── boot ─────────────────────────────────────────────────────────────────────────────────
  function boot() {
    checkHealth();
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
