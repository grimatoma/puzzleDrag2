---
name: design-doc
description: >-
  Use when writing, organizing, or consolidating a design doc, technical spec, RFC/ADR, or a game economy/balance write-up — and ESPECIALLY when an existing doc has grown bloated, repetitive, or rambling ("reads like sticky notes / an old man's notebook", "states the same thing five times", "I can't follow the plan", "too much status sprinkled through it") and needs to be split or rewritten into a cohesive linear plan. Governs the CONTENT shape of a design doc (what goes in it and where), not its visual form — pair it with the html-docs skill for rendering. Triggers on: "make this doc cohesive / linear", "split this into focused docs", "consolidate / dedupe this spec", "write the canonical design doc", or a balance/design pass that needs writing up.
---

# Design Doc — ship the decision, not the deliberation

A design doc that rambles almost never has a *thinking* problem — the design is
usually coherent. It has an **assembly** problem: the file ships the
deliberation (every option weighed, every fact re-explained, every "decided this
review" marker) instead of the decision. This skill is the content discipline
that keeps a design/spec/balance doc reading like a plan.

**Scope:** this skill owns *what goes in the doc and where* — the content shape.
It does **not** own form. For rendering a checked-in doc as a single
self-contained HTML page (tabs, SVG diagrams, status chips), use the
**`html-docs`** skill. For *producing* balance decisions in the first place, use
**`game-balance`**, then write the result up with this skill.

## Why docs ramble (the mechanism)

In an edit loop, the model treats existing text as load-bearing and works
*around* it: asked to incorporate a new decision, it **adds** a clean local
explanation far sooner than it deletes three stale ones. Its bias is
**conservation, not consolidation**, so the doc grows like sediment. The visible
symptoms all fall out of one root cause — **one file trying to be four documents
at once** (a design pitch + a systems reference + a build-status tracker + a
grounding/audit note, braided together):

- **The same fact stated 4–6 times**, often near-verbatim, because each pass
  re-explained it locally without noticing it already existed elsewhere.
- **Status marginalia** — `done` / `today` / `locked` / `TODO` chips stuck onto
  sentences, so you can read neither the design nor the status cleanly.
- **A per-section bolded aphorism** restating the section — nice once, but in
  bulk it's the old-man-with-a-saying-for-everything cadence.
- **The same thing at three resolutions** (a list, then a table, then prose) —
  successive passes, all kept.

## The five rules (highest leverage first)

### 1. Split into artifacts — one job each
Don't let one file do four jobs. Separate:
- **The design doc** — *decisions only*, present tense. No status tags, no
  Gaps/TODO list, no "weighed option A vs B" deliberation. It says how the thing
  *is* (or will be), not how you got there.
- **The status / build tracker** — what's built vs. in-progress vs. planned, and
  open questions. Its own doc, or issues. This is the *only* place status lives.
- **The data reference** — numbers, rosters, costs. Ideally **generated** from
  the source of truth (constants/config) so it can't drift; hand-written only as
  a stopgap, clearly labeled for later generation.

For a large surface, split the **design** itself into a few **focused topic
docs** behind a thin index — so each can get a focused discussion — rather than
one mega-doc. A reader (or a review conversation) should be able to open exactly
the slice they care about.

### 2. Rewrite from a blank page — never "update"
This is the rule that fixes the conservation bias. When new decisions land,
**do not edit the old doc.** Take the old doc + the new decisions as *input* and
write the doc again from scratch, under an explicit instruction: *no fact may
appear more than once; you are encouraged to delete.* Editing re-accretes;
rewriting consolidates. (Git keeps the history — the doc doesn't need to.)

### 3. Separate the design session from the doc-writing session
Let the design/balance *conversation* ramble — exploring options is what
thinking looks like. Then, in a **fresh pass**, hand over only the resolved
decisions and write the canonical doc. A doc written inside the deliberation
inherits the shape of the deliberation. Don't ship the scaffolding with the
building.

### 4. Outline first, one concept one home
Produce the **table of contents and get sign-off before writing prose.** Then
hold the line: **every concept lives in exactly one section.** Everywhere else
*references* it ("hiring cost — see Currency") instead of re-deriving it. This
single rule is what kills the 4–6× repetition at the source.

### 5. No status tags in the body, no per-section punchlines
State each point **once, in the body, plainly.** Status (`done/today/locked`)
belongs in the tracker artifact (rule 1), never as inline marginalia. And drop
the bolded mic-drop at the end of each section — the section already made the
point.

## Self-audit before you call it done
Read your own draft against this checklist (literally search it):

- [ ] Does any fact appear more than once? → fold into one home, reference it elsewhere.
- [ ] Any inline status tag (`done/today/locked/TODO/WIP`) in the design body? → move to the tracker.
- [ ] Does any section end on a bolded aphorism restating itself? → delete it.
- [ ] Is the same thing shown at two+ resolutions (list **and** table **and** prose)? → keep the one that carries the most, cut the rest.
- [ ] Are deliberation / "we considered X" passages present? → move to the design conversation or a decision-log, out of the doc.
- [ ] Could a reader open one focused doc and understand that slice without the others? If not, the split (rule 1) isn't done.

## When NOT to reach for this
- A short note or a chat answer — don't manufacture a doc.
- A README / CONTRIBUTING / machine-read doc — those follow their own conventions (see `html-docs`).
- Pure visual/form polish with no content problem — that's `html-docs`.

## Portable
Project-agnostic. Copy the `design-doc/` folder into any repo's `.claude/skills/`
to carry the convention forward; it contains no project-specific content.
