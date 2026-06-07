---
name: particles-vfx
description: Use when implementing particle effects — GPUParticles2D/3D, ParticleProcessMaterial, emission shapes, subemitters, trails, attractors, collision, and common VFX recipes
---

# Particle Systems in Godot 4.3+

All examples target Godot 4.3+ with no deprecated APIs. GDScript is shown first, then C#.

> **Related skills:** **shader-basics** for custom particle shaders, **3d-essentials** for lighting and environment that affect particles, **2d-essentials** for 2D rendering context, **tween-animation** for code-driven VFX timing, **godot-optimization** for particle performance tuning.

---

## 1. Core Concepts

### GPU vs CPU Particles

| Node                | Processing | Features                                | Use For                        |
|---------------------|------------|-----------------------------------------|--------------------------------|
| `GPUParticles2D`    | GPU        | Full features, high counts, trails      | Most 2D effects                |
| `GPUParticles3D`    | GPU        | Full features, attractors, collision    | Most 3D effects                |
| `CPUParticles2D`    | CPU        | Simpler, no trails/attractors           | Low-end devices, few particles |
| `CPUParticles3D`    | CPU        | Simpler, no trails/attractors           | Low-end devices, few particles |

**Rule of thumb:** Use GPU particles by default. Switch to CPU particles only for low-end/web targets or when you need CPU-side particle positions (e.g., spawning objects at particle locations).

> You can convert between GPU and CPU particles in the editor: select the node → toolbar → **Convert to CPUParticles2D/3D** (or vice versa).

### Particle System Architecture

```
GPUParticles2D/3D
├── Process Material (ParticleProcessMaterial)   ← physics, emission, color
├── Draw Pass 1 (Mesh)                            ← what each particle looks like
└── (Optional) Draw Pass 2-4                      ← additional meshes
```

### Minimal Setup

1. Add a **GPUParticles2D** (or 3D) node
2. In Inspector → Process Material → **New ParticleProcessMaterial**
3. Set **Amount** (number of particles)
4. Configure emission, direction, velocity, gravity
5. (2D) Set **Texture** for particle appearance
6. (3D) Set **Draw Pass 1** mesh (QuadMesh for billboards, or custom mesh)

---

## 2. Key Node Properties

### GPUParticles2D/3D Properties

| Property          | Type     | Description                                         |
|-------------------|----------|-----------------------------------------------------|
| `emitting`        | `bool`   | Start/stop emission                                 |
| `amount`          | `int`    | Total particles alive at once                       |
| `lifetime`        | `float`  | Seconds each particle lives                         |
| `one_shot`        | `bool`   | Emit once then stop                                 |
| `preprocess`      | `float`  | Simulate this many seconds before first frame       |
| `speed_scale`     | `float`  | Time multiplier for particle physics                |
| `explosiveness`   | `float`  | 0.0 = spread over lifetime, 1.0 = all at once      |
| `fixed_fps`       | `int`    | Lock particle update rate (0 = match render FPS)    |
| `local_coords`    | `bool`   | Particles move with the node (true) or stay in world (false) |
| `draw_order`      | `enum`   | Index, Lifetime, or Reverse Lifetime                |
| `amount_ratio`    | `float`  | Fraction of particles to emit (0.0–1.0)             |

### One-Shot vs Continuous

```gdscript
# Continuous emitter (fire, smoke, ambient dust)
$GPUParticles2D.one_shot = false
$GPUParticles2D.emitting = true

# One-shot burst (explosion, impact splash)
$GPUParticles2D.one_shot = true
$GPUParticles2D.emitting = false  # arm it
# Later, trigger:
$GPUParticles2D.restart()
$GPUParticles2D.emitting = true
```

```csharp
// Continuous
var particles = GetNode<GpuParticles2D>("GPUParticles2D");
particles.OneShot = false;
particles.Emitting = true;

// One-shot burst
particles.OneShot = true;
particles.Emitting = false;
// Trigger:
particles.Restart();
particles.Emitting = true;
```

---

## 3. ParticleProcessMaterial — Essential Properties

### Emission Shape

| Shape             | Description                                    |
|-------------------|------------------------------------------------|
| `Point`           | All particles spawn at origin                  |
| `Sphere`          | Random position within a sphere                |
| `Sphere Surface`  | Random position on sphere surface only         |
| `Box`             | Random position within a box                   |
| `Ring`             | Random position on a ring/torus               |
| `Points`          | Spawn at positions from a texture/mesh         |
| `Directed Points` | Spawn at positions with normals from mesh      |

```gdscript
var mat := ParticleProcessMaterial.new()
mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
mat.emission_sphere_radius = 2.0
```

```csharp
var mat = new ParticleProcessMaterial();
mat.EmissionShape = ParticleProcessMaterial.EmissionShapeEnum.Sphere;
mat.EmissionSphereRadius = 2.0f;
```

### Direction, Velocity & Gravity

```gdscript
var mat := ParticleProcessMaterial.new()

# Direction particles move (normalized)
mat.direction = Vector3(0.0, 1.0, 0.0)  # upward
mat.spread = 30.0  # degrees of randomness around direction

# Speed
mat.initial_velocity_min = 5.0
mat.initial_velocity_max = 10.0

# Gravity
mat.gravity = Vector3(0.0, -9.8, 0.0)
```

```csharp
var mat = new ParticleProcessMaterial();
mat.Direction = new Vector3(0.0f, 1.0f, 0.0f);
mat.Spread = 30.0f;
mat.InitialVelocityMin = 5.0f;
mat.InitialVelocityMax = 10.0f;
mat.Gravity = new Vector3(0.0f, -9.8f, 0.0f);
```

### Scale Over Lifetime

```gdscript
mat.scale_min = 1.0
mat.scale_max = 1.5

# Scale curve — shrink over lifetime
var curve := CurveTexture.new()
var c := Curve.new()
c.add_point(Vector2(0.0, 1.0))  # full size at birth
c.add_point(Vector2(1.0, 0.0))  # zero at death
curve.curve = c
mat.scale_curve = curve
```

```csharp
var mat = new ParticleProcessMaterial();
mat.ScaleMin = 1.0f;
mat.ScaleMax = 1.5f;

var curve = new CurveTexture();
var c = new Curve();
c.AddPoint(new Vector2(0.0f, 1.0f));
c.AddPoint(new Vector2(1.0f, 0.0f));
curve.Curve = c;
mat.ScaleCurve = curve;
```

### Color Over Lifetime

```gdscript
# Gradient: white → orange → transparent
var grad := GradientTexture1D.new()
var g := Gradient.new()
g.set_color(0, Color(1.0, 1.0, 1.0, 1.0))  # start: white
g.add_point(0.5, Color(1.0, 0.5, 0.0, 0.8))  # middle: orange
g.set_color(1, Color(1.0, 0.2, 0.0, 0.0))  # end: transparent red
grad.gradient = g
mat.color_ramp = grad
```

```csharp
var grad = new GradientTexture1D();
var g = new Gradient();
g.SetColor(0, new Color(1.0f, 1.0f, 1.0f, 1.0f));
g.AddPoint(0.5f, new Color(1.0f, 0.5f, 0.0f, 0.8f));
g.SetColor(1, new Color(1.0f, 0.2f, 0.0f, 0.0f));
grad.Gradient = g;
mat.ColorRamp = grad;
```

### Damping & Acceleration

```gdscript
# Damping — slow particles down over time (smoke deceleration)
mat.damping_min = 2.0
mat.damping_max = 5.0

# Radial acceleration — push away from center (explosion) or pull in (implosion)
mat.radial_accel_min = 5.0   # positive = outward
mat.radial_accel_max = 8.0

# Tangential acceleration — orbit around center
mat.tangential_accel_min = 2.0
mat.tangential_accel_max = 3.0
```

### Angular Velocity (Rotation)

```gdscript
mat.angular_velocity_min = -90.0  # degrees per second
mat.angular_velocity_max = 90.0
```

---

## 4. Common VFX Recipes

The recipes most projects need: **fire** (2D, looped emission with hot-color gradient + scale-down), **explosion burst** (one-shot, high-amount short-lifetime), **dust / footstep puff** (one-shot, scale-up + rapid fade).

> See [references/vfx-recipes.md](references/vfx-recipes.md) for ready-to-use GDScript wiring and recommended `ParticleProcessMaterial` settings for all three.

---

## 5. Trails (Forward+ and Mobile only)

Set `trail_enabled = true` on `GPUParticles2D/3D` and assign a `Mesh` (`RibbonTrailMesh` or `TubeTrailMesh`). Trails are NOT supported in the Compatibility renderer.

> See [references/trails.md](references/trails.md) for the setup and trail-mesh-type comparison.

---

## 6. Subemitters

A particle can spawn another particle scene at lifecycle events (birth, collision, death, manual). Configure via `ParticleProcessMaterial.SubEmitterMode` + `subemitter` property on the parent particles node.

> See [references/subemitters.md](references/subemitters.md) for trigger modes, scene setup, GDScript and C# (v1.6.0 parity), and limitations.

---

## 7. Attractors & Collision (3D)

`GPUParticlesAttractor*3D` (Box / Sphere / Vector Field) pulls particles toward a region. `GPUParticlesCollision*3D` (Box / Sphere / SDF / HeightField) lets particles bounce off geometry. Both Forward+/Mobile only; no 2D equivalents.

> See [references/attractors-and-collision.md](references/attractors-and-collision.md) for full setup of each attractor and collision type.

---

## 8. Turbulence

Set `turbulence_enabled = true` on `ParticleProcessMaterial` and tune `turbulence_noise_strength` (0.5–2.0 typical), `turbulence_noise_scale` (lower = larger swirls), `turbulence_noise_speed` (animate the noise field). Cheap effect for "alive" smoke, fire, dust.

---

## 9. Flipbook Animation (2D)

Sprite-sheet animated particles via `ParticleProcessMaterial.AnimSpeedMin/Max` + `CanvasItemMaterial.ParticlesAnimHFrames/VFrames` for the sheet layout. Particles cycle through frames over their lifetime.

> See [references/flipbook-animation.md](references/flipbook-animation.md) for the full setup with GDScript + C# (v1.6.0 parity).

---

## 10. Performance Tips

| Technique                    | Savings              | When to Use                          |
|------------------------------|----------------------|--------------------------------------|
| Lower `amount`               | Linear GPU savings   | Always — use minimum needed          |
| `fixed_fps = 30`             | Halves particle updates | Background particles, ambient       |
| `amount_ratio` < 1.0         | Scale down dynamically | Quality settings slider              |
| Smaller textures             | Less VRAM + bandwidth | Mobile, many particle systems        |
| `local_coords = true`        | Cheaper transforms   | When particles should move with node |
| Disable `turbulence`         | Removes 3D noise cost | Mobile/web targets                   |
| Fewer `trail_sections`       | Less trail geometry  | When trail smoothness isn't critical |
| `visibility_rect` (2D)       | Skips off-screen     | Always set for 2D particles          |

### Dynamic Quality Scaling

```gdscript
# Adjust particle density based on quality setting
func set_particle_quality(level: float) -> void:
    # level: 0.25 (low) to 1.0 (high)
    for particles in get_tree().get_nodes_in_group("particles"):
        if particles is GPUParticles2D or particles is GPUParticles3D:
            particles.amount_ratio = level
```

```csharp
public void SetParticleQuality(float level)
{
    foreach (var node in GetTree().GetNodesInGroup("particles"))
    {
        if (node is GpuParticles2D p2d)
            p2d.AmountRatio = level;
        else if (node is GpuParticles3D p3d)
            p3d.AmountRatio = level;
    }
}
```

---

## 11. Common Pitfalls

| Symptom                              | Cause                                          | Fix                                                              |
|--------------------------------------|-------------------------------------------------|------------------------------------------------------------------|
| Particles invisible                  | No texture (2D) or no draw pass mesh (3D)       | Set texture or assign a mesh to Draw Pass 1                      |
| Particles appear then vanish immediately | `lifetime` too short                         | Increase `lifetime` (default 1.0s)                               |
| One-shot doesn't re-trigger          | Need to call `restart()` before setting `emitting = true` | Call `restart()` then set `emitting = true`            |
| Particles emit in wrong direction    | `direction` or `gravity` misconfigured          | In 2D, Y is inverted — upward is `Vector3(0, -1, 0)`            |
| Particles don't follow the node      | `local_coords` is `false`                       | Set `local_coords = true` for attached effects                   |
| Particles pop in (no pre-warming)    | No `preprocess` time set                        | Set `preprocess` to 1–2x `lifetime` for ambient effects          |
| Color ramp has no effect             | Using `color` property which overrides ramp      | Clear the base `color` (set to white) when using `color_ramp`    |
| Trails not rendering                 | Missing trail material setup or wrong renderer   | Enable "Use Particle Trails" on material; use Forward+ or Mobile |
| Attractors have no effect            | `attractor_interaction_enabled` is `false`       | Enable on the ParticleProcessMaterial                            |
| Subemitter not spawning              | Child `amount` is too low to accommodate spawns  | Increase child system's `amount`                                 |
| Particles flicker on mobile          | `fixed_fps` not set or too high                  | Set `fixed_fps = 30` for consistency across devices              |

---

## 12. Implementation Checklist

- [ ] Particle `amount` is set to the minimum needed for the visual effect
- [ ] `lifetime` matches the visual duration — not too short or too long
- [ ] `one_shot` is enabled for burst effects (explosions, impacts)
- [ ] `preprocess` is set for always-visible ambient effects (fire, smoke, dust)
- [ ] Emission shape matches the source geometry (sphere for explosions, box for area effects)
- [ ] `color_ramp` fades alpha to 0 at the end so particles don't vanish abruptly
- [ ] `scale_curve` shrinks particles over lifetime for natural fade
- [ ] `local_coords` is set correctly — `true` for attached effects, `false` for world-space
- [ ] One-shot particles are cleaned up with `queue_free` after `lifetime` + margin
- [ ] `visibility_rect` (2D) is set to prevent particles from being culled prematurely
- [ ] Dynamic quality scaling uses `amount_ratio` for player-accessible quality settings
- [ ] Performance-heavy features (turbulence, trails) are disabled on low-end targets
