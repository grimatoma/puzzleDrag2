# Cursor Tool Mapping

Skills use Claude Code tool names. When you encounter these in a skill, use your platform equivalent:

| Skill references | Cursor equivalent |
|-----------------|-------------------|
| `Skill` tool (invoke a skill) | **Read** `.claude/skills/<name>/SKILL.md` (or `.cursor/skills/<name>/SKILL.md`) |
| `Read` (file reading) | `Read` |
| `Write` (file creation) | `Write` |
| `Edit` / patch edits | `StrReplace` |
| `Bash` (run commands) | `Shell` |
| `Grep` (search file content) | `Grep` |
| `Glob` (search files by name) | `Glob` |
| `Task` tool (dispatch subagent) | `Task` with `subagent_type`: `generalPurpose`, `explore`, `shell`, `cursor-guide`, `ci-investigator`, `best-of-n-runner` |
| Multiple `Task` calls (parallel) | Multiple `Task` calls in one message |
| `TodoWrite` (task tracking) | `TodoWrite` |
| `WebFetch` | `WebFetch` |
| `WebSearch` | `WebSearch` |
| `EnterPlanMode` / `ExitPlanMode` | `SwitchMode` (`target_mode_id`: `plan` / `agent`) |
| `AskUserQuestion` | `AskQuestion` |
| `mcp__github__create_pull_request` | `gh pr create` (see user creating-pull-requests rule) |
| `mcp__github__*` (other) | `gh pr`, `gh api`, etc. |

## Invoking skills in Cursor

There is no `Skill` tool. Load the full skill body with **Read** before acting:

```
.claude/skills/<skill-name>/SKILL.md
```

Skill names match the directory name (e.g. `subagent-driven-development`, not `superpowers:subagent-driven-development`).

## Subagent dispatch

Use the `Task` tool for skills like `subagent-driven-development` and `dispatching-parallel-agents`. Pass a detailed `prompt` with all context—the subagent does not see parent chat history.

Subagents dispatched for a single task should skip `using-superpowers` per `<SUBAGENT-STOP>` in that skill.

## Background shells

| Tool | Purpose |
|------|---------|
| `Shell` with `block_until_ms: 0` | Run long commands in background |
| `Await` | Poll background shell output |

## PR workflow in this repo

`pre-pr-check` references GitHub MCP tools. In Cursor, use `gh` per the repo's user rules: `git push -u origin HEAD`, then `gh pr create`. Open PRs as **non-draft**; use merge commits, not squash.
