// Polls /b/index.html and reloads when a new build is deployed.
// The /b/ route is excluded from the service worker (see vite.config.js
// denylist), so SW-based updates never fire here — this fills that gap.
//
// Strategy: on load, capture the <script type="module"> src from the live
// DOM (Vite embeds a content-hash in the filename). Periodically re-fetch
// /b/index.html and extract the same attribute. A changed src means a new
// build was deployed — reload to get the latest binary.

const POLL_MS = 60_000;

function currentScriptSrc(): string {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"]');
  return s?.src ?? "";
}

async function fetchLatestScriptSrc(): Promise<string> {
  const res = await fetch("/b/", { cache: "no-store" });
  const text = await res.text();
  const m = text.match(/src="([^"]*balanceEntry[^"]*)"/);
  return m ? m[1] : text; // fall back to full HTML if pattern misses
}

export function startAutoReload(): () => void {
  const initial = currentScriptSrc();
  let destroyed = false;

  async function check() {
    if (destroyed) return;
    try {
      const latest = await fetchLatestScriptSrc();
      if (latest && latest !== initial) {
        window.location.reload();
      }
    } catch {
      // offline or transient — try again next tick
    }
  }

  const id = window.setInterval(check, POLL_MS);
  window.addEventListener("focus", check);
  document.addEventListener("visibilitychange", check);

  return () => {
    destroyed = true;
    window.clearInterval(id);
    window.removeEventListener("focus", check);
    document.removeEventListener("visibilitychange", check);
  };
}
