# `reference/` — supporting material, **not** the game

> **Read this before you use anything in this folder to form an opinion.**

Everything under `reference/` is **prior internal thinking and supporting
tooling** — design specs, strategy/UX reviews, zone proposals, art-style boards,
playtest write-ups, and the art-generation pipeline. It is kept in-repo because
it is genuinely useful when *building* art, zones, wiki, and seasonal tiles.

**It is not the game, and it is not the source of truth.**

The game is `src/`, `public/`, `tests/`, and the three Vite entries
(`index.html`, `b/`, `story/`). When the code and a doc here disagree, **the code
is right** and the doc is stale.

## The rule that matters

This folder was split out once because, when asked to *evaluate* the codebase,
agents kept lifting opinions straight from these docs instead of looking at the
code. So:

- **When asked to evaluate, critique, audit, or propose a direction:** form your
  own assessment **from the code**. Treat anything in `reference/` as *claims to
  verify against the source*, never as conclusions to adopt or repeat. Do not
  cite a doc here as evidence of how the game behaves — read `src/`.
- **When asked to implement** art / seasonal tiles / zones / wiki / town layout:
  this material *is* the intended pipeline — use it (alongside the matching
  `.claude/skills/` skills, which stay where they are so they remain invocable).

## What's here

| Path | What it is |
|---|---|
| `reference/docs/` | All design docs, specs, proposals, reviews, playtest reports, the zone atlas, and the seasonal-tile system source-of-truth. Published to the Pages docs site by `reference/tools/build-docs.mjs`. |
| `reference/tools/` | Art/docs tooling: the PixelLab pipeline (`pixellab/`), icon-review renderers (`icon-review/`), the docs-site generator (`build-docs.mjs`), icon trackers, and one-off codemods. None of it is wired into the game build or tests. |
| `reference/scripts/` | Art helper scripts (seasonal-tile montage). |

Game-wired tooling (anything the build/tests actually run) deliberately stays at
the repo root under `tools/` — e.g. `tools/playtest/`, `tools/vite/`,
`tools/list-action-types.mjs`. If you add a tool, put it here only if the game
build and tests never touch it.
