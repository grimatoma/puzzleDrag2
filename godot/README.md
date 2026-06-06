# puzzleDrag2 — Godot 4 port

The Godot 4.6 version of the game, built side-by-side with the React+Phaser
version at the repo root. Strategy: [`docs/godot-migration-plan.html`](../docs/godot-migration-plan.html).
Live status & decisions: [`docs/godot-migration-progress.html`](../docs/godot-migration-progress.html).

## Layout

```
godot/
  project.godot          # Godot 4.6 project, GL Compatibility renderer, portrait
  export_presets.cfg     # "Web" preset (nothreads → works on GitHub Pages)
  icon.svg
  scripts/
    Constants.gd         # board dims, Farm tile set, thresholds, placeholder colors
    BoardLogic.gd        # pure rules: chain validation, collapse, refill, dead-board
  scenes/
    Tile.gd              # one placeholder tile (procedural _draw)
    Board.gd             # 6x6 grid: render + drag input + collect/collapse/refill
    Main.gd / Main.tscn  # root scene: Board + HUD (chain counter, resource tally)
  tests/
    run_tests.gd         # headless unit tests for BoardLogic (exit 0/1)
    run_scene_smoke.gd   # headless Main+Board wiring smoke (exit 0/1)
  tools/
    screenshot.gd        # render Main to a PNG (evidence / visual checks)
    demo_capture.gd      # capture a highlighted chain + post-resolve board
```

`Constants` and `BoardLogic` are registered via `class_name`, so their consts,
enums, and static helpers are reachable in headless tests without a live tree.

## Run

```bash
# Open the editor (local dev)
godot --path godot --editor

# Play the game (windowed)
godot --path godot

# Import once (builds .godot/ cache + global class registry)
godot --headless --path godot --import

# Unit tests (pure board logic)
godot --headless --path godot --script res://tests/run_tests.gd

# Scene wiring smoke test
godot --headless --path godot --script res://tests/run_scene_smoke.gd

# Web export (needs export templates for 4.6.2 installed)
godot --headless --path godot --export-release "Web" dist/index.html
```

On Windows the binary used during development is
`Godot_v4.6.2-stable_win64_console.exe` (console variant prints to stdout).

CI runs the two test scripts and the Web export on every push that touches
`godot/**` — see [`.github/workflows/godot-ci.yml`](../.github/workflows/godot-ci.yml).
