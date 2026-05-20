# Third-party skill sources

The following skills under `.claude/skills/` are vendored from upstream open-source
projects. Their content is preserved as-is from the source commit; any future
local modifications should be noted here.

## From [obra/superpowers](https://github.com/obra/superpowers) (MIT, Copyright (c) 2025 Jesse Vincent)

- `brainstorming/`
- `dispatching-parallel-agents/`
- `executing-plans/`
- `finishing-a-development-branch/`
- `receiving-code-review/`
- `requesting-code-review/`
- `subagent-driven-development/`
- `systematic-debugging/`
- `test-driven-development/`
- `using-git-worktrees/`
- `using-superpowers/`
- `verification-before-completion/`
- `writing-plans/`
- `writing-skills/`

Upstream license: MIT. The Superpowers project also ships as a Claude Code
plugin via `obra/superpowers-marketplace`; we vendor the skills directly so
they travel with the repo and don't depend on marketplace availability.

## From [anthropics/skills](https://github.com/anthropics/skills) (Apache-2.0)

- `skill-creator/`

Upstream license: Apache-2.0.

## Locally authored

- `check-slice-action/`
- `coverage-gaps/`
- `dev-server/`
- `phaser-scene-debug/`
- `pre-pr-check/`
- `resource-add/`
