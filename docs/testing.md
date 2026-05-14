# Testing Setup

This project standardizes on Node 22. Use `.nvmrc` locally, then install from the lockfile:

```bash
nvm use
npm ci
npm run test:e2e:install
```

## Local Commands

```bash
npm run lint
npm run test
npm run build
npm run test:e2e:smoke
npm run test:e2e:full
```

`npm run test:all` runs lint, unit tests, build, and the Playwright smoke suite.

## E2E Notes

Playwright starts Vite with `VITE_E2E=1`, which exposes a small browser-only test bridge at `window.__hearthE2E`. Production builds do not expose this bridge.

The smoke suite covers app boot, navigation, draft dialogue consumption, and the story-editor/flags authoring flow. The full suite covers board, economy, crafting, persistence, hazards, and longer gameplay paths.

CI runs lint, unit coverage, build, and e2e smoke on PRs and pushes to `main`.
The full Playwright suite runs on the nightly scheduled CI job.

## Codex Cloud Setup

Use a setup command equivalent to:

```bash
sudo apt-get update
sudo apt-get install -y ripgrep
npm ci
npx playwright install --with-deps chromium
```

If Node/npm are not already available, configure the environment to install Node 22 before running `npm ci`.
