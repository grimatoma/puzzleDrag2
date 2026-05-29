// Vanilla dashboard. No external libraries — SVG chart drawn by hand.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Escape untrusted text (LLM output, ticker symbols, prompt text) before it is
// interpolated into innerHTML. Prevents stored/reflected XSS from model output
// or user-authored prompt content. Also safe for HTML attribute values since
// it escapes both quote characters.
function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function fmtTs(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}
function fmtPct(p) {
  if (p === null || p === undefined) return "—";
  const s = p >= 0 ? "+" : "";
  return `${s}${p.toFixed(2)}%`;
}

// ---- tabs ----
$$("#tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$("#tabs button").forEach((b) => b.classList.remove("active"));
    $$(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $("#tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "overview") loadOverview();
    if (btn.dataset.tab === "leaderboard") loadLeaderboard();
    if (btn.dataset.tab === "mindchanges") loadMindChanges();
    if (btn.dataset.tab === "prompts") loadPrompts();
  });
});

// ---- Overview ----
async function loadOverview() {
  try {
    const [summary, status] = await Promise.all([
      api("/api/metrics/summary"),
      api("/api/status"),
    ]);
    const cards = [
      ["Runs", summary.runs],
      ["Recommendations", summary.recommendations],
      ["Unique tickers", summary.uniqueTickers],
      ["Mind changes", summary.mindChangeEvents],
      ["Spikes evaluated", summary.spikeEvaluated],
      ["Spike hits", summary.spikeHits],
      ["Spike hit-rate", summary.spikeHitRate === null ? "—" : (summary.spikeHitRate * 100).toFixed(0) + "%"],
    ];
    $("#cards").innerHTML = cards
      .map(([lbl, val]) => `<div class="card"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>`)
      .join("");
    const s = status.scheduler || {};
    $("#statusBar").textContent =
      `Providers: LLM=${(status.providers||{}).llm}, market=${(status.providers||{}).market}. ` +
      `Scheduler ${s.running ? "running" : "stopped"}. ` +
      `Last run: ${s.lastRun ? fmtTs(s.lastRun.at) + " (" + s.lastRun.type + ")" : "none"}.`;
  } catch (e) {
    $("#statusBar").textContent = "Error: " + e.message;
  }
}

$("#runNowBtn").addEventListener("click", async () => {
  $("#runNowResult").textContent = "Running…";
  try {
    const r = await api("/api/run-now", { method: "POST" });
    $("#runNowResult").textContent =
      `Run #${r.runId}: ${r.recommendations} recs, ${r.uniqueTickers} tickers, ${r.mindChanges} mind-changes, ${r.pricesStored} prices.`;
    loadOverview();
  } catch (e) {
    $("#runNowResult").textContent = "Error: " + e.message;
  }
});

// ---- Leaderboard ----
async function loadLeaderboard() {
  const rows = await api("/api/tickers");
  const tbody = $("#leaderboardTable tbody");
  tbody.innerHTML = rows
    .map(
      (r) =>
        `<tr data-sym="${esc(r.ticker)}"><td>${esc(r.ticker)}</td><td>${r.recCount}</td><td>${r.promptCount}</td><td>${fmtTs(r.firstSeen)}</td><td>${fmtTs(r.lastSeen)}</td></tr>`,
    )
    .join("");
  if (!rows.length) tbody.innerHTML = `<tr><td colspan="5" class="muted">No data yet — run a poll.</td></tr>`;
  $$("#leaderboardTable tbody tr[data-sym]").forEach((tr) => {
    tr.addEventListener("click", () => {
      $$("#tabs button").forEach((b) => b.classList.remove("active"));
      $$(".tab-panel").forEach((p) => p.classList.remove("active"));
      document.querySelector('#tabs button[data-tab="ticker"]').classList.add("active");
      $("#tab-ticker").classList.add("active");
      $("#tickerInput").value = tr.dataset.sym;
      loadTicker(tr.dataset.sym);
    });
  });
}

// ---- Mind changes ----
async function loadMindChanges() {
  const events = await api("/api/mind-changes?limit=300");
  const list = $("#mindChangeList");
  if (!events.length) {
    list.innerHTML = `<li class="muted">No mind-change events yet. Run several polls.</li>`;
    return;
  }
  list.innerHTML = events
    .map((e) => {
      const stance =
        e.change_type === "stance_flip"
          ? ` (${esc(e.prev_stance)} → ${esc(e.new_stance)})`
          : e.new_stance
          ? ` (${esc(e.new_stance)})`
          : e.prev_stance
          ? ` (was ${esc(e.prev_stance)})`
          : "";
      return `<li><span class="tag ${esc(e.change_type)}">${esc(e.change_type)}</span> <strong>${esc(e.ticker)}</strong>${stance} — prompt <code>${esc(e.prompt_key)}</code> <span class="muted">${fmtTs(e.ts)}</span></li>`;
    })
    .join("");
}

// ---- Ticker detail + SVG chart ----
$("#loadTickerBtn").addEventListener("click", () => loadTicker($("#tickerInput").value.trim().toUpperCase()));

async function loadTicker(sym) {
  if (!sym) return;
  const d = await api("/api/ticker/" + encodeURIComponent(sym));
  const series = d.priceSeries || [];
  let html = `<h3>${esc(d.ticker)}</h3>`;
  html += renderChart(series, d.mindChanges || []);

  // Spike windows table
  if (d.spikeWindows && d.spikeWindows.length) {
    const cols = d.spikeConfig.windowsHours;
    html += `<h4>Spike windows after "added" events (threshold ${d.spikeConfig.thresholdPct}%)</h4>`;
    html += `<table><thead><tr><th>Event time</th><th>Prompt</th>` +
      cols.map((c) => `<th>+${c}h</th>`).join("") +
      `<th>Spike?</th></tr></thead><tbody>`;
    for (const w of d.spikeWindows) {
      html += `<tr><td>${fmtTs(w.ts)}</td><td><code>${esc(w.promptKey)}</code></td>` +
        cols.map((c) => {
          const v = w.byWindow[c];
          const cls = v === null ? "" : v >= 0 ? "pos" : "neg";
          return `<td class="${cls}">${fmtPct(v)}</td>`;
        }).join("") +
        `<td>${w.spike ? '<span class="badge spike">SPIKE</span>' : '<span class="badge nospike">no</span>'}</td></tr>`;
    }
    html += `</tbody></table>`;
  } else {
    html += `<p class="muted">No "added" mind-change events for this ticker yet.</p>`;
  }

  // Rec events
  if (d.recEvents && d.recEvents.length) {
    html += `<h4>Recommendation history</h4><ul class="timeline">`;
    html += d.recEvents
      .map((r) => `<li><strong>${esc(r.stance)}</strong> rank ${esc(r.rank)} — prompt <code>${esc(r.prompt_key)}</code> <span class="muted">${fmtTs(r.ts)}</span></li>`)
      .join("");
    html += `</ul>`;
  }
  $("#tickerDetail").innerHTML = html;
}

function renderChart(series, mindChanges) {
  if (!series.length) return `<p class="muted">No price samples yet.</p>`;
  const W = 720, H = 260, pad = 36;
  const xs = series.map((s) => s.ts);
  const ys = series.map((s) => s.price);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const px = (t) => pad + ((t - minX) / spanX) * (W - 2 * pad);
  const py = (v) => H - pad - ((v - minY) / spanY) * (H - 2 * pad);

  const path = series.map((s, i) => `${i ? "L" : "M"}${px(s.ts).toFixed(1)},${py(s.price).toFixed(1)}`).join(" ");

  // Event markers (vertical lines) for "added" events.
  const markers = mindChanges
    .filter((e) => e.change_type === "added" && e.ts >= minX && e.ts <= maxX)
    .map((e) => `<line x1="${px(e.ts).toFixed(1)}" y1="${pad}" x2="${px(e.ts).toFixed(1)}" y2="${H - pad}" stroke="#2ec27e" stroke-dasharray="4 3" opacity="0.7"/>`)
    .join("");

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:10px 0;">
      <text x="${pad}" y="16" fill="#8b93a3" font-size="11">$${maxY.toFixed(2)}</text>
      <text x="${pad}" y="${H - pad + 4}" fill="#8b93a3" font-size="11">$${minY.toFixed(2)}</text>
      ${markers}
      <path d="${path}" fill="none" stroke="#4f9cff" stroke-width="2" />
    </svg>
    <p class="muted">${series.length} price samples. Dashed green lines mark "added" mind-change events.</p>
  `;
}

// ---- Prompts ----
async function loadPrompts() {
  const prompts = await api("/api/prompts");
  $("#promptList").innerHTML = prompts
    .map(
      (p) => `
      <div class="prompt-row" data-key="${esc(p.key)}">
        <strong>${esc(p.label)}</strong> <code>${esc(p.key)}</code>
        <span class="badge ${p.active ? "spike" : "nospike"}">${p.active ? "active" : "inactive"}</span>
        <div class="ptext">${esc(p.text)}</div>
        <div class="toolbar" style="margin-top:8px;">
          <input class="edit-text" value="${esc(p.text)}" style="flex:1;min-width:200px;" />
          <button class="secondary save-btn">Save</button>
          <button class="secondary toggle-btn">${p.active ? "Deactivate" : "Activate"}</button>
          <button class="danger del-btn">Delete</button>
        </div>
      </div>`,
    )
    .join("");

  $$("#promptList .prompt-row").forEach((row) => {
    const key = row.dataset.key;
    row.querySelector(".save-btn").addEventListener("click", async () => {
      await api("/api/prompts/" + key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: row.querySelector(".edit-text").value }),
      });
      msg("Saved " + key);
      loadPrompts();
    });
    row.querySelector(".toggle-btn").addEventListener("click", async () => {
      const active = row.querySelector(".toggle-btn").textContent === "Activate";
      await api("/api/prompts/" + key, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      loadPrompts();
    });
    row.querySelector(".del-btn").addEventListener("click", async () => {
      await api("/api/prompts/" + key, { method: "DELETE" });
      msg("Deleted " + key);
      loadPrompts();
    });
  });
}

$("#addPromptBtn").addEventListener("click", async () => {
  try {
    await api("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: $("#newKey").value.trim(),
        label: $("#newLabel").value.trim(),
        text: $("#newText").value.trim(),
        active: $("#newActive").checked,
      }),
    });
    $("#newKey").value = $("#newLabel").value = $("#newText").value = "";
    msg("Added prompt");
    loadPrompts();
  } catch (e) {
    msg("Error: " + e.message);
  }
});

function msg(t) { $("#promptMsg").textContent = t; }

// initial
loadOverview();
