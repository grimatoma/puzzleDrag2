#!/usr/bin/env node
/**
 * gate-guard: keep GitHub branch protection in sync with the checked-in
 * .github/required-checks.json.
 *
 * The authoritative required-check list lives in the tree; branch protection
 * lives only in repo settings and can silently drift (exactly the "the gate
 * went out of date, not the tests" failure mode in the health review §6). This
 * reads the branch's required status checks via the API and FAILS if any check
 * this file marks required is NOT actually enforced.
 *
 * It SOFT-SKIPS (warns, exits 0) when it can't read protection — no token, a
 * fork PR, insufficient scope, or protection simply not configured yet — so it
 * never blocks a legitimate build; it only bites on a genuine, observable drift.
 *
 * Env: GITHUB_TOKEN (or GH_TOKEN), GITHUB_REPOSITORY ("owner/repo").
 * See reference/docs/projects/24-test-suite-and-infra-review.html §6.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const cfg = JSON.parse(readFileSync(path.join(ROOT, ".github", "required-checks.json"), "utf8"));
const required = cfg.required ?? [];
const branch = cfg.branch ?? "main";

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;

function skip(msg) {
  console.warn(`[gate-guard] skipped: ${msg}`);
  process.exit(0);
}

if (!token) skip("no GITHUB_TOKEN/GH_TOKEN in env");
if (!repo || !repo.includes("/")) skip("no GITHUB_REPOSITORY in env");

const url = `https://api.github.com/repos/${repo}/branches/${branch}/protection/required_status_checks`;

let res;
try {
  res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gate-guard",
    },
  });
} catch (e) {
  skip(`network error reaching GitHub API: ${e.message}`);
}

if (res.status === 404) skip(`no branch protection / required status checks configured on '${branch}'`);
if (res.status === 401 || res.status === 403) skip(`token cannot read branch protection (HTTP ${res.status})`);
if (!res.ok) skip(`GitHub API returned HTTP ${res.status}`);

const body = await res.json();
// The API exposes both the legacy `contexts` array and the newer `checks[].context`.
const configured = new Set([
  ...(body.contexts ?? []),
  ...((body.checks ?? []).map((c) => c.context)),
]);

const missing = required.filter((r) => !configured.has(r));
if (missing.length) {
  console.error(
    `\n[gate-guard] ✗ branch protection on '${branch}' is missing required check(s) listed in ` +
      `.github/required-checks.json:\n  ${missing.join("\n  ")}\n\n` +
      `Add them to the branch's required status checks, or update .github/required-checks.json ` +
      `if the intended gate set changed. Currently enforced: ${[...configured].join(", ") || "(none)"}`,
  );
  process.exit(1);
}

console.log(`[gate-guard] OK: all ${required.length} required checks are enforced on '${branch}'.`);
