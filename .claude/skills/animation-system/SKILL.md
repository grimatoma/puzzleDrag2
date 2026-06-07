---
name: animation-system
description: Use when implementing animations — AnimationPlayer, AnimationTree, blend trees, state machines, sprite animation, and code-driven animation
---

# Animation System in Godot 4.3+

All examples target Godot 4.3+ with no deprecated APIs. GDScript is shown first, then C#.

> **Related skills:** **state-machine** for gameplay state management, **player-controller** for movement that drives animation, **component-system** for reusable animation components, **2d-essentials** for TileMaps, parallax scrolling, 2D lights, and canvas layer organization, **3d-essentials** for AnimationTree and 3D animation blending, **shader-basics** for shader-driven hit flash and dissolve effects, **tween-animation** for code-driven motion alongside keyframe animation.

---

## 1. Core Concepts

### AnimationPlayer vs AnimationTree

| Node              | Use For                                  | Complexity | Notes                                              |
|-------------------|------------------------------------------|------------|----------------------------------------------------|
| `AnimationPlayer` | Simple playback, one-shot effects        | Low        | Play/stop/queue individual clips directly          |
| `AnimationTree`   | Blending, transitions, layered animation | Medium-High| State machines and blend trees for smooth transitions |

**Rule of thumb:** Start with AnimationPlayer. Add AnimationTree when you need blending between animations (walk/run blend, directional movement, layered upper/lower body).

### Animation Workflow

```
1. Create AnimationPlayer node       → holds all animation clips
2. Add tracks in the Animation panel → keyframe properties, methods, audio
3. (Optional) Add AnimationTree      → blend/transition logic
4. Trigger from code                 → play(), travel(), set parameters
```

---

## 2. AnimationPlayer Basics

### Scene Structure

```
Character (CharacterBody2D)
├── Sprite2D
└── AnimationPlayer
```

AnimationPlayer can animate **any property** on any sibling or child node: sprite frames, modulate, position, rotation, scale, visibility, collision shape disabled state, method calls (Call Method track), audio playback (Audio Playback track).

### GDScript — Basic Playback

```gdscript
extends CharacterBody2D

@onready var anim_player: AnimationPlayer = $AnimationPlayer

func _physics_process(delta: float) -> void:
    var input_dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")

    if input_dir != Vector2.ZERO:
        velocity = input_dir * 200.0
        anim_player.play("walk")
    else:
        velocity = Vector2.ZERO
        anim_player.play("idle")

    move_and_slide()
```

### C# — Basic Playback

```csharp
using Godot;

public partial class Character : CharacterBody2D
{
    private AnimationPlayer _animPlayer;

    public override void _Ready()
    {
        _animPlayer = GetNode<AnimationPlayer>("AnimationPlayer");
    }

    public override void _PhysicsProcess(double delta)
    {
        Vector2 inputDir = Input.GetVector("ui_left", "ui_right", "ui_up", "ui_down");

        if (inputDir != Vector2.Zero)
        {
            Velocity = inputDir * 200.0f;
            _animPlayer.Play("walk");
        }
        else
        {
            Velocity = Vector2.Zero;
            _animPlayer.Play("idle");
        }

        MoveAndSlide();
    }
}
```

> Calling `play()` with the same animation name while it's already playing does nothing (no restart). This is safe to call every frame.

### Playback Control

```gdscript
anim_player.play("attack")
anim_player.play_backwards("attack")
anim_player.queue("idle")            # play after current
anim_player.stop()
anim_player.pause()
anim_player.play()                   # resume from paused position
anim_player.speed_scale = 2.0
anim_player.seek(0.5)
```

```csharp
_animPlayer.Play("attack");
_animPlayer.PlayBackwards("attack");
_animPlayer.Queue("idle");
_animPlayer.Stop();
_animPlayer.Pause();
_animPlayer.Play();
_animPlayer.SpeedScale = 2.0;
_animPlayer.Seek(0.5);
```

---

## 3. Animation Signals

```gdscript
func _ready() -> void:
    anim_player.animation_finished.connect(_on_animation_finished)

func _on_animation_finished(anim_name: StringName) -> void:
    match anim_name:
        "attack":
            anim_player.play("idle")
        "death":
            queue_free()
```

```csharp
public override void _Ready()
{
    _animPlayer = GetNode<AnimationPlayer>("AnimationPlayer");
    _animPlayer.AnimationFinished += OnAnimationFinished;
}

private void OnAnimationFinished(StringName animName)
{
    if (animName == "attack")
        _animPlayer.Play("idle");
    else if (animName == "death")
        QueueFree();
}
```

### Method Call Tracks

Add a **Call Method** track to trigger game logic at exact animation frames (spawn projectile at frame 5, play SFX at impact frame, enable hitbox during swing). In the Animation panel: Add Track → Call Method Track → select target node → add keyframes → set method name and arguments.

```gdscript
func spawn_projectile() -> void:
    var bullet := preload("res://scenes/bullet.tscn").instantiate()
    get_parent().add_child(bullet)
    bullet.global_position = $Muzzle.global_position

func enable_hitbox() -> void:
    $HitboxArea/CollisionShape2D.disabled = false
```

---

## 4. Sprite Frame Animation

Two approaches for 2D character animation: `AnimatedSprite2D` (quick, frames-only) and `AnimationPlayer + Sprite2D` (full property animation). Pick AnimatedSprite2D for simple characters; AnimationPlayer when you also animate hitboxes, particles, sounds, or other properties in sync.

> See [references/sprite-animation.md](references/sprite-animation.md) for the full GDScript and C# example (a CharacterBody2D walking with `AnimatedSprite2D` driven by `Input.get_vector` and `flip_h`).

---

## 5. AnimationTree — Canonical State Machine

### Scene Structure

```
Character (CharacterBody2D)
├── Sprite2D
├── AnimationPlayer        ← holds all clips
└── AnimationTree          ← controls blending/transitions
    (tree_root = AnimationNodeStateMachine or AnimationNodeBlendTree)
```

**Setup:** Add AnimationTree as a sibling of AnimationPlayer. Set `anim_player` to point at the AnimationPlayer. Set `active = true`. Choose a root: **AnimationNodeStateMachine** (discrete states with transitions) or **AnimationNodeBlendTree** (continuous blending).

### State Machine — GDScript

```gdscript
extends CharacterBody2D

@onready var anim_tree: AnimationTree = $AnimationTree
@onready var state_machine: AnimationNodeStateMachinePlayback = anim_tree["parameters/playback"]

func _physics_process(delta: float) -> void:
    var input_dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")

    if input_dir != Vector2.ZERO:
        velocity = input_dir * 200.0
        state_machine.travel("walk")
    else:
        velocity = Vector2.ZERO
        state_machine.travel("idle")

    move_and_slide()

func attack() -> void:
    # travel() transitions smoothly; use start() for immediate switch
    state_machine.travel("attack")

func get_current_state() -> StringName:
    return state_machine.get_current_node()
```

### State Machine — C#

```csharp
using Godot;

public partial class Character : CharacterBody2D
{
    private AnimationTree _animTree;
    private AnimationNodeStateMachinePlayback _stateMachine;

    public override void _Ready()
    {
        _animTree = GetNode<AnimationTree>("AnimationTree");
        _stateMachine = _animTree.Get("parameters/playback").As<AnimationNodeStateMachinePlayback>();
    }

    public override void _PhysicsProcess(double delta)
    {
        Vector2 inputDir = Input.GetVector("ui_left", "ui_right", "ui_up", "ui_down");

        if (inputDir != Vector2.Zero)
        {
            Velocity = inputDir * 200.0f;
            _stateMachine.Travel("walk");
        }
        else
        {
            Velocity = Vector2.Zero;
            _stateMachine.Travel("idle");
        }

        MoveAndSlide();
    }

    public void Attack()
    {
        _stateMachine.Travel("attack");
    }
}
```

### Blend Trees — BlendSpace1D / BlendSpace2D

For continuous blending (walk↔run on a speed parameter; 4/8-directional movement on a 2D vector). Set the root to **AnimationNodeBlendTree**, add a **BlendSpace1D** or **BlendSpace2D**, place animations at compass positions (e.g., walk @ 0.0, run @ 1.0; idle_down @ (0,1), idle_right @ (1,0)). Drive the blend each frame:

```gdscript
# 1D — speed blend
var blend_amount := inverse_lerp(walk_speed, run_speed, velocity.length())
anim_tree["parameters/BlendSpace1D/blend_position"] = blend_amount

# 2D — direction blend
anim_tree["parameters/BlendSpace2D/blend_position"] = input_dir
```

```csharp
_animTree.Set("parameters/BlendSpace1D/blend_position", blendAmount);
_animTree.Set("parameters/BlendSpace2D/blend_position", inputDir);
```

---

## 6. Skeleton Modifiers (3D, 4.4+)

### LookAtModifier3D (Godot 4.4+)

Procedurally rotates a bone to look at a world-space target. Ideal for head tracking and eye contact without extra animation clips.

> See [references/skeleton-modifiers.md](references/skeleton-modifiers.md) for the full GDScript and C# example with angle limits and influence blending.

### BoneConstraint3D (Godot 4.5+)

`AimModifier3D`, `CopyTransformModifier3D`, and `ConvertTransformModifier3D` operate **bone-relative** rather than world-space — use them when the aim/source target is itself a bone on the same skeleton (mirroring, secondary rig binding, bone-to-bone aiming).

> See [references/bone-constraints.md](references/bone-constraints.md) for the full deep dive — modifier table, scene structure, GDScript and C# examples for AimModifier3D and CopyTransformModifier3D.

### SpringBoneSimulator3D (Godot 4.4+)

Simulates spring physics on bones — hair, capes, tails, antennas bounce and sway procedurally. Add as child of `Skeleton3D`, configure spring chains (root bone, end bone, stiffness, damping, gravity, drag) in the Inspector.

> See [references/skeleton-modifiers.md](references/skeleton-modifiers.md) for property reference table and recommended starting values per use-case (hair, antennas, capes).

### Animation Markers (Godot 4.4+)

Markers define named points/regions within an animation clip — use them for subregion loops, section-based playback, and audio-synced events without splitting clips. Right-click the timeline → **Add Marker** → name it (e.g., `hit_frame`, `loop_start`). Read `anim_player.current_animation_position` and compare to marker times in code, or feed markers to AudioStreamInteractive for sync.

### Animation Retargeting (Godot 4.3+)

Godot 4.3 retargets animations from one skeleton to another during `.glb`/`.gltf` import via `SkeletonProfile` (e.g., `SkeletonProfileHumanoid`). Animations then target generic profile bone names, so any matching skeleton can play them.

> See [references/retargeting.md](references/retargeting.md) for the full import-dock setup steps.

---

## 7. IKModifier3D — Solver Comparison (Godot 4.6+)

Godot 4.6 adds `IKModifier3D`, a base class for skeletal IK solvers, with eight subclasses covering the most common algorithms. These are `SkeletonModifier3D` children of `Skeleton3D` and work alongside other modifiers (e.g., `LookAtModifier3D`).

**Pick the right solver:**

| Solver | Algorithm | Cost | Best for | Joint count | Notes |
|---|---|---|---|---|---|
| `TwoBoneIK3D` | Analytical two-bone | Cheapest | Legs, arms (chain is exactly 2 bones) | Exactly 2 | Fast and exact. Default when the chain is hip→knee→ankle or shoulder→elbow→wrist. |
| `CCDIK3D` | Cyclic Coordinate Descent | Cheap | Tails, tentacles, simple arms | 2–6 joints | Iterative; can twist unnaturally on long chains. Good default for short arms. |
| `FABRIK3D` | Forward And Backward Reaching | Moderate | Spines, longer limbs, natural reach | 3–10 joints | Forward-and-backward reaching; smooth, stable. Best when the chain length is variable. |
| `JacobianIK3D` | Jacobian / pseudo-inverse | Expensive | Overdetermined rigs, robotic arms | Any | Solves a Jacobian per step; most accurate, most CPU. Reserve for cinematic or hero rigs. |
| (4 further subclasses) | Various | Varies | See 4.6 release notes | — | — |

Default to `TwoBoneIK3D` when the chain is exactly 2 bones (the common humanoid case). Use `CCDIK3D` for short non-2-bone chains. Upgrade to `FABRIK3D` when the result twists or overshoots, or when chain length varies. Reach for `JacobianIK3D` only when rig accuracy is the bottleneck of frame quality, not frame time.

> See [references/ik-recipes.md](references/ik-recipes.md) for the full GDScript and C# recipes — two-bone arm reach with influence blending (CCDIK3D), foot placement on uneven terrain (FABRIK3D + raycast), and basic FABRIK arm IK setup.

---

## 8. Common Recipes

Two gameplay-flavored animation recipes: a hit-flash modulate tween and a buffered attack combo using AnimationPlayer's Call Method track.

> See [references/common-recipes.md](references/common-recipes.md) for the full GDScript and C# code (Hit Flash, Attack Combo with combo-window buffering).

---

## 9. Common Pitfalls

| Symptom                                          | Cause                                                  | Fix                                                                |
|--------------------------------------------------|--------------------------------------------------------|--------------------------------------------------------------------|
| Animation snaps instead of blending              | Using `AnimationPlayer.play()` instead of AnimationTree | Switch to AnimationTree with state machine or blend tree           |
| AnimationTree does nothing                       | `active` is `false`                                    | Set `anim_tree.active = true` in Inspector or `_ready()`           |
| `travel()` doesn't transition                    | No transition path between states                      | Add transition arrows in the AnimationTree state machine editor    |
| Animation plays but sprite doesn't change        | Track targets wrong node path                          | Verify the track's node path matches the actual scene tree         |
| Method call track doesn't fire                   | Method name typo or wrong target node                  | Check the track's node path and method name match exactly          |
| Blend parameters have no effect                  | Wrong parameter path string                            | Use `"parameters/<NodeName>/blend_position"` — check in Inspector  |
| Animation resets to frame 0 every physics frame  | Calling `play()` every frame on a non-looping clip     | Guard with `if anim_player.current_animation != "name"`            |

---

## 10. Implementation Checklist

- [ ] AnimationPlayer is a direct child of the animated node (not nested deeper)
- [ ] All animation track node paths are valid (no broken references after scene restructuring)
- [ ] AnimationTree `active` is set to `true` and `anim_player` points to the correct AnimationPlayer
- [ ] State machine transitions have appropriate fade times (0.1–0.2s for responsive gameplay)
- [ ] Looping animations (idle, walk, run) have loop mode set to **Loop** in the Animation panel
- [ ] One-shot animations (attack, jump, death) have loop mode set to **None**
- [ ] Call Method tracks are used for gameplay events (hitbox enable/disable, spawn projectiles, play SFX)
- [ ] Blend parameters are set from gameplay code every frame (not just on state change)
- [ ] `animation_finished` signal is connected for one-shot animations that need follow-up logic
- [ ] Head/eye tracking uses `LookAtModifier3D` instead of manual bone rotation (Godot 4.4+)
- [ ] Hair, capes, and tails use `SpringBoneSimulator3D` instead of custom physics scripts (Godot 4.4+)
- [ ] Shared animation libraries use retargeting with `SkeletonProfileHumanoid` (Godot 4.3+)
- [ ] Bone-to-bone aim/copy constraints use `AimModifier3D` / `CopyTransformModifier3D` instead of manual bone transform code (Godot 4.5+)
- [ ] Arm/leg IK uses `IKModifier3D` subclasses (`TwoBoneIK3D` for two-bone limbs, `FABRIK3D` for longer chains) rather than custom IK scripts (Godot 4.6+)
