---
name: using-godot-prompter
description: Bootstrap skill — establishes how to find and use GodotPrompter skills, with platform-specific tool mapping
---

# Using GodotPrompter

> **Related skills:** **godot-project-setup** for scaffolding a new project, **godot-brainstorming** for design exploration, **godot-code-review** for reviewing finished code, **godot-debugging** for diagnosing runtime issues.

GodotPrompter provides Godot 4.x domain-specific skills for AI coding agents. Skills cover project setup, architecture patterns, gameplay systems, UI, multiplayer, testing, and deployment — for both GDScript and C#.

## How to Access Skills

**In Claude Code:** Use the `Skill` tool with the skill name (e.g., `Skill: "godot-prompter:state-machine"`).

**In Copilot CLI:** Use the `skill` tool. Skills are auto-discovered from installed plugins.

**In Gemini CLI:** Use the `activate_skill` tool. See `references/gemini-tools.md` for tool mapping.

**In Cursor:** Skills are loaded via custom instructions / rules system.

## Coexistence with Other Plugins (e.g., Superpowers)

When another plugin (like Superpowers) is handling workflow (brainstorming, planning, execution), GodotPrompter skills STILL APPLY during implementation. They are not replaced — they are domain-specific guidance that workflow plugins cannot provide.

**RULE: Before implementing ANY Godot system, you MUST check for a matching godot-prompter skill and invoke it.**

This is not optional. Workflow plugins handle HOW you work. GodotPrompter handles WHAT you build. Both are needed.

| Implementing...         | MUST invoke skill                                      |
|-------------------------|--------------------------------------------------------|
| Player movement         | `godot-prompter:player-controller`                     |
| State machine / FSM     | `godot-prompter:state-machine`                         |
| Signals / EventBus      | `godot-prompter:event-bus`                             |
| Scene tree structure    | `godot-prompter:scene-organization`                    |
| UI / HUD                | `godot-prompter:godot-ui`, `godot-prompter:hud-system` |
| Inventory               | `godot-prompter:inventory-system`                      |
| Save/Load               | `godot-prompter:save-load`                             |
| Enemy AI / navigation   | `godot-prompter:ai-navigation`                         |
| Camera                  | `godot-prompter:camera-system`                         |
| Audio                   | `godot-prompter:audio-system`                          |
| Weapons / combat        | `godot-prompter:component-system`                      |
| Resources / data        | `godot-prompter:resource-pattern`                      |
| Input handling          | `godot-prompter:input-handling`                        |
| Animation               | `godot-prompter:animation-system`                      |
| Testing                 | `godot-prompter:godot-testing`                         |
| Project scaffolding     | `godot-prompter:godot-project-setup`                   |
| Shaders / VFX           | `godot-prompter:shader-basics`, `godot-prompter:particles-vfx` |
| Physics                 | `godot-prompter:physics-system`                        |
| Multiplayer             | `godot-prompter:multiplayer-basics`                    |
| Export / deploy         | `godot-prompter:export-pipeline`                       |

**For subagents:** If you are a subagent executing a plan task in a Godot project, check this table before writing code. The skill provides Godot-specific patterns, node types, and checklists you cannot derive from general knowledge.

## Workflow: From Idea to Working Game

GodotPrompter handles the full development workflow. No other plugins required.

### 1. Design Phase
Load `godot-prompter:godot-brainstorming` — it guides you through:
- Asking clarifying questions about the game/system
- Proposing architectural approaches with trade-offs
- Designing scene trees, signal maps, and data flow
- Creating an implementation plan with ordered tasks

### 2. Implementation Phase
For each task in the plan, load the relevant domain skill:
- Building a player? Load `godot-prompter:player-controller` and `godot-prompter:state-machine`
- Adding inventory? Load `godot-prompter:inventory-system`
- Need save/load? Load `godot-prompter:save-load`

Each skill provides complete code examples, Godot best practices, and a checklist.

### 3. Review Phase
Load `godot-prompter:godot-code-review` to review the code against Godot-specific checklists.

### Agents

- **godot-game-architect** — Designs systems, plans scene trees, chooses patterns
- **godot-game-dev** — Implements features guided by skills
- **godot-code-reviewer** — Reviews code against Godot best practices
- **godot-shader-author** — Authors custom shaders, post-processing, Compositor effects
- **godot-performance-profiler** — Diagnoses performance issues from profiler data
- **godot-animator** — Designs animation graphs, blend trees, IKModifier3D, BoneConstraint3D, retargeting
- **godot-csharp-engineer** — C#-first development; parity mode for closing this repo's C# debt
- **godot-ui-designer** — Builds Control-tree UI — themes, responsive layouts, localization-aware
- **godot-tools-engineer** — Editor plugins, custom inspectors, gizmos, `@tool` scripts, plugin distribution

### Plan Storage
Implementation plans and design docs are saved to `docs/godot-prompter/plans/` and `docs/godot-prompter/specs/` in the user's project.

## Platform Adaptation

Skills use Claude Code tool names as the canonical reference. Non-Claude platforms: see the appropriate tool mapping file in `references/` for your platform's equivalents:

- [`references/copilot-tools.md`](references/copilot-tools.md) — GitHub Copilot CLI
- [`references/codex-tools.md`](references/codex-tools.md) — Codex
- [`references/cursor-tools.md`](references/cursor-tools.md) — Cursor
- [`references/gemini-tools.md`](references/gemini-tools.md) — Gemini CLI (Gemini also auto-loads this via `GEMINI.md`)

## Available Skill Categories

### Core / Process
- `using-godot-prompter` — This skill (bootstrap)
- `godot-project-setup` — Scaffold new projects
- `godot-brainstorming` — Godot-specific design exploration
- `godot-code-review` — GDScript/C# review against Godot best practices
- `godot-debugging` — Godot-specific debugging techniques
- `godot-testing` — TDD with GUT and gdUnit4

### Architecture & Patterns
- `scene-organization` — Scene tree structure, composition patterns
- `state-machine` — FSM patterns (node-based, resource-based, enum-based)
- `event-bus` — Signal-based decoupling, autoload event systems
- `component-system` — Composition over inheritance
- `resource-pattern` — Custom Resources as data containers
- `dependency-injection` — Autoloads, service locators

### Gameplay Systems
- `player-controller` — CharacterBody2D/3D movement, input handling
- `input-handling` — InputEvent system, Input Map, controllers/gamepads, mouse/touch, rebinding
- `animation-system` — AnimationPlayer, AnimationTree, blend trees, state machines
- `tween-animation` — Tween class, easing, chaining, parallel sequences, motion recipes
- `inventory-system` — Resource-based inventory patterns
- `dialogue-system` — Dialogue trees and patterns
- `save-load` — Serialization strategies
- `ai-navigation` — NavigationAgent, behavior trees
- `camera-system` — Camera follow, shake, zones
- `audio-system` — Audio buses, music management, SFX pooling, spatial audio
- `localization` — i18n/l10n, TranslationServer, CSV/PO, locale switching, RTL
- `procedural-generation` — Noise, BSP dungeons, cellular automata, WFC, seeded randomness

### UI/UX
- `godot-ui` — Control nodes, themes, containers
- `responsive-ui` — Multi-resolution scaling
- `hud-system` — In-game HUD patterns

### Multiplayer
- `multiplayer-basics` — MultiplayerAPI, RPCs, authority
- `multiplayer-sync` — Synchronization, interpolation
- `dedicated-server` — Headless export, server architecture

### Physics & 2D/3D
- `physics-system` — RigidBody, Area, raycasting, collision shapes, Jolt, ragdolls
- `2d-essentials` — TileMaps, parallax, 2D lights/shadows, particles, canvas layers
- `3d-essentials` — Materials, lighting, shadows, environment, GI, fog, LOD, decals
- `xr-development` — OpenXR, XROrigin3D, hand tracking, controllers, Meta Quest

### Rendering & Visual
- `shader-basics` — Godot shader language, visual shaders, common recipes, post-processing
- `particles-vfx` — GPUParticles2D/3D, process materials, subemitters, trails, attractors

### Build & Deploy
- `export-pipeline` — Platform exports, CI/CD
- `godot-optimization` — Profiler, performance patterns
- `addon-development` — EditorPlugin, tool scripts
- `assets-pipeline` — Image compression, 3D scene import, audio formats, resource management

### Scripting
- `gdscript-patterns` — Static typing, await/coroutines, lambdas, match, exports, idioms
- `csharp-godot` — C# conventions, GodotSharp API
- `csharp-signals` — C# signal patterns

### Math & Data
- `math-essentials` — Vectors, transforms, interpolation, curves, paths, RNG

---

## Implementation Checklist

- [ ] Identified the matching domain skill via the table above before writing any system code
- [ ] Invoked the identified skill with the `Skill` tool (or platform equivalent) before implementation
- [ ] When a workflow plugin is also active (Superpowers, etc.), still invoked the relevant godot-prompter domain skill during implementation — they are complementary, not exclusive
- [ ] After implementation, ran `godot-prompter:godot-code-review` to validate against Godot best practices
- [ ] Logged any newly-discovered domain gap that no current skill covers, so it can become a future skill
