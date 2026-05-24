#!/usr/bin/env node
// Sandbox-friendly Playwright browser bootstrap.
//
// Some hosted/sandbox environments block `cdn.playwright.dev` (the host
// `npx playwright install` reaches for) but pre-install an older Chromium
// revision at /opt/pw-browsers. When Playwright's pinned revision drifts past
// the pre-installed one, `test:visual` fails with "Executable doesn't exist".
//
// This script bridges that gap: it asks Playwright where it expects the
// chrome-headless-shell binary, looks for any pre-installed chrome-headless-shell
// directory under /opt/pw-browsers, and symlinks the older binary into the
// expected location under the file layout the current Playwright expects.
//
// No-op on hosts where the right browser is already present (CI, dev laptops).
// Never throws — visual tests should fail loudly with their own error if the
// bootstrap can't help, rather than this script blocking the test run.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";

const PRE_INSTALLED_ROOT = "/opt/pw-browsers";
const HEADLESS_SHELL = "chrome-headless-shell";

function expectedInstallDir() {
  try {
    const out = execSync(
      "npx --no-install playwright install --dry-run chromium-headless-shell",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const m = out.match(/Install location:\s+(\S+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function findPreinstalledShell() {
  if (!existsSync(PRE_INSTALLED_ROOT)) return null;
  for (const name of readdirSync(PRE_INSTALLED_ROOT)) {
    if (!name.startsWith("chromium_headless_shell-")) continue;
    const candidate = join(PRE_INSTALLED_ROOT, name, "chrome-linux", "headless_shell");
    if (existsSync(candidate)) {
      return join(PRE_INSTALLED_ROOT, name);
    }
  }
  return null;
}

function linkInto(srcDir, destDir, renames = {}) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const destName = renames[entry.name] ?? entry.name;
    const dest = join(destDir, destName);
    if (existsSync(dest)) continue;
    symlinkSync(join(srcDir, entry.name), dest);
  }
}

const expected = expectedInstallDir();
if (!expected) {
  process.exit(0);
}

const expectedBin = join(expected, `${HEADLESS_SHELL}-linux64`, HEADLESS_SHELL);
if (existsSync(expectedBin)) {
  process.exit(0);
}

const fallback = findPreinstalledShell();
if (!fallback) {
  console.warn(
    `ensure-playwright-browser: no fallback found under ${PRE_INSTALLED_ROOT}; ` +
      "run `npx playwright install chromium-headless-shell` if network allows.",
  );
  process.exit(0);
}

console.log(
  `ensure-playwright-browser: linking ${basename(fallback)} -> ${basename(expected)}`,
);

linkInto(
  join(fallback, "chrome-linux"),
  join(expected, `${HEADLESS_SHELL}-linux64`),
  { headless_shell: HEADLESS_SHELL },
);

for (const marker of ["INSTALLATION_COMPLETE", "DEPENDENCIES_VALIDATED"]) {
  const p = join(expected, marker);
  if (!existsSync(p)) writeFileSync(p, "");
}
