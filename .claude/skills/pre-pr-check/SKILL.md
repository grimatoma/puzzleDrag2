---
name: pre-pr-check
description: Pre-flight validation + PR body generation in this repo's established style. Use before opening any PR. Runs lint+tests+build, summarizes commits since base, generates PR body with Summary / per-section bullets / Test plan / Deferred sections.
---

# pre-pr-check

You've opened ~10 PRs in this repo with nearly identical structure:
- Title: `<scope> — <one-line summary>`
- Body sections: `## Summary` (bullets grouped by severity) → `## Test plan` (checkboxes) → `## Deferred` (if applicable)
- Footer: `https://claude.ai/code/session_…`

This skill prevents typos, missing tests, and divergent PR styles.

## Procedure

1. **Sanity checks** (parallel where possible):
   - `npm test -- --run` — must pass; record exact count.
   - `npm run lint` — must be clean.
   - `npm run build` — must succeed.
   - If any fail, STOP and report. Do not open the PR.

2. **Branch state**:
   - `git status --short` — must be clean (no uncommitted changes).
   - `git log --oneline <base>..HEAD` — list commits since base (default base = `main`).
   - `git rev-parse --abbrev-ref HEAD` — current branch.

3. **Generate the body** using this skeleton:
   ```markdown
   ## Summary

   <One-paragraph framing of why this PR exists.>

   ### CRITICAL  (only include if any)
   - **<bug name>**: <one-sentence root cause>. <one-sentence fix.>

   ### HIGH
   - **<bug name>**: ...

   ### MEDIUM
   - **<polish item>**: ...

   ## Test plan

   - [x] `npm test -- --run` — **<count> passed / 0 failed** (<files> files)
   - [x] `npm run build` — succeeds
   - [x] `npm run lint` — clean

   ## Deferred  (only include if any)

   - <item that's tracked but not done>

   <session footer>
   ```

4. **Title rules**:
   - Under 70 chars.
   - For QA passes: `QA Pass <N> — <theme>`.
   - For features: `feat: <one-liner>`.
   - For fixes: `fix: <one-liner>`.

5. **Confirm with user before pushing if it's a destructive action** (force-push to rebased branch, etc).

6. **Push + open PR** via `mcp__github__create_pull_request`. Open as **non-draft** (CLAUDE.md mandates this — auto-merge requires it).

## Validation checklist

```
[ ] Tests pass
[ ] Lint clean
[ ] Build succeeds
[ ] Working tree clean
[ ] Title < 70 chars
[ ] Body has Summary, Test plan
[ ] Body has Deferred section if applicable
[ ] Session footer present
[ ] PR is NOT a draft
```

## Common pitfalls

- Opening as draft: CLAUDE.md explicitly says don't (auto-merge can't enable on drafts).
- Skipping the Deferred section when items were genuinely deferred — future you reads PR descriptions to recover that context.
- Padding the body with `WHAT` (the diff already shows that). Focus on `WHY`.
- Forgetting to update PR base if main moved — verify `head ahead of base`, not `behind`.

## When to invoke

- After completing a fix batch on a working branch.
- After a Pass-N subagent finishes and you've reviewed its commits.
- Before any merge into main.
