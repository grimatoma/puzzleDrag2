---
name: 3d-essentials
description: Use when working with 3D-specific systems — materials, lighting, shadows, environment, global illumination, fog, LOD, occlusion culling, and decals in Godot 4.3+
---

# 3D Essentials in Godot 4.3+

All examples target Godot 4.3+ with no deprecated APIs. GDScript is shown first, then C#.

> **Related skills:** **player-controller** for CharacterBody3D movement, **physics-system** for 3D collision shapes and raycasting, **camera-system** for Camera3D follow and transitions, **shader-basics** for spatial shaders and post-processing, **godot-optimization** for 3D performance tuning, **animation-system** for AnimationTree and 3D animation blending.

---

## 1. 3D Coordinate System & Core Nodes

### Coordinate System

Godot uses a **right-handed** coordinate system with metric units (1 unit = 1 meter):

| Axis | Direction | Color  |
|------|-----------|--------|
| X    | Right     | Red    |
| Y    | Up        | Green  |
| Z    | Out of screen (+Z toward viewer) | Blue |

> Cameras and lights point along **-Z** by default. When a character "faces forward," they look along -Z.

### Essential 3D Nodes

| Node               | Purpose                                         |
|--------------------|-------------------------------------------------|
| `Node3D`           | Base transform node — position, rotation, scale |
| `MeshInstance3D`    | Displays a mesh with a material                 |
| `Camera3D`         | Required to render 3D — perspective or orthogonal |
| `DirectionalLight3D` | Sun/moon — parallel rays, cheapest light      |
| `OmniLight3D`      | Point light — emits in all directions           |
| `SpotLight3D`      | Cone light — flashlights, spotlights            |
| `WorldEnvironment` | Sky, fog, tonemap, post-processing              |
| `Decal`            | Projected texture onto surfaces                 |
| `GPUParticles3D`   | GPU-driven particle effects                     |
| `CSGBox3D` etc.    | Constructive Solid Geometry — prototyping       |
| `GridMap`           | 3D tile-based level building                   |

### Minimal 3D Scene

```
World (Node3D)
├── Camera3D
├── DirectionalLight3D
├── WorldEnvironment
├── MeshInstance3D (floor)
└── MeshInstance3D (player model)
```

---

## 2. Materials

### StandardMaterial3D vs ShaderMaterial

| Material             | Use For                                     | Notes                          |
|----------------------|---------------------------------------------|--------------------------------|
| `StandardMaterial3D` | Most 3D objects — PBR workflow              | No code; Inspector-driven      |
| `ORMMaterial3D`      | Same as Standard but with packed ORM texture | Occlusion+Roughness+Metallic in one texture |
| `ShaderMaterial`     | Custom effects — toon, water, dissolve      | Requires spatial shader code   |

### Key StandardMaterial3D Properties

The PBR core: `albedo_color` / `albedo_texture` (base color), `metallic` (0 dielectric → 1 metal), `roughness` (0 mirror → 1 matte), `normal_map` (surface detail), `ao_texture` (ambient occlusion). Add `emission` + `emission_energy_multiplier` for self-illumination, `heightmap_texture` for parallax, `rim` / `clearcoat` for material flair.

### Transparency Modes

| Mode                | Performance | Shadows | Use For                          |
|---------------------|-------------|---------|----------------------------------|
| Disabled            | Fastest     | Yes     | Fully opaque objects             |
| Alpha               | Slow        | No      | Semi-transparent glass, water    |
| Alpha Scissor       | Fast        | Yes     | Binary cutout (leaves, fences)   |
| Alpha Hash          | Medium      | Yes     | Dithered transparency (hair)     |
| Depth Pre-Pass      | Medium      | Partial | Mostly opaque with transparent edges |

### Setting Materials from Code & Material Instancing

Create a `StandardMaterial3D` at runtime, assign to `mesh.material_override`, and drive emissive flashes via Tween. Use `.duplicate()` to make per-instance copies so changing one mesh's material doesn't affect others.

> See [references/materials-and-lighting-recipes.md](references/materials-and-lighting-recipes.md) for the full GDScript and C# recipes (basic material setup, emissive flash, per-instance duplicate, dynamic OmniLight3D explosion).

---

## 3. Lighting

### Light Types Comparison

| Light               | Shape         | Shadows | Cost    | Max Visible          |
|---------------------|---------------|---------|---------|----------------------|
| `DirectionalLight3D` | Parallel rays | PSSM    | Cheapest | 8 (Forward+)       |
| `OmniLight3D`       | Sphere        | Cube/Dual Paraboloid | Medium | 512 clustered* |
| `SpotLight3D`       | Cone          | Single texture | Cheap | 512 clustered*     |

*Forward+ shares 512 clustered element slots among omni lights, spot lights, decals, and reflection probes.

### Light Properties

| Property | Type | Default | Notes |
|---|---|---|---|
| `light_color` | `Color` | white | Drive day/night with a Tween or `Environment.sun_position` |
| `light_energy` | `float` | 1.0 | HDR; values >1 are valid |
| `shadow_enabled` | `bool` | false | Big perf hit when enabled |
| `directional_shadow_mode` | enum | 4 splits | `ORTHOGONAL` / `PARALLEL_2_SPLITS` / `PARALLEL_4_SPLITS` |
| `directional_shadow_max_distance` | `float` | 100 m | Lower = sharper shadows |

```gdscript
sun.light_color = Color(1.0, 0.95, 0.9)
sun.shadow_enabled = true
sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
sun.directional_shadow_max_distance = 100.0
```

```csharp
sun.LightColor = new Color(1.0f, 0.95f, 0.9f);
sun.ShadowEnabled = true;
sun.DirectionalShadowMode = DirectionalLight3D.ShadowMode.Parallel4Splits;
sun.DirectionalShadowMaxDistance = 100.0f;
```

### Dynamic Point Light

Spawn an `OmniLight3D` at runtime, drive its energy with a tween, queue-free on completion. Common for explosions, muzzle flashes, magic effects.

> See [references/materials-and-lighting-recipes.md](references/materials-and-lighting-recipes.md#dynamic-point-light) for the full GDScript and C# recipe.

### Shadow Configuration Tips

| Setting                     | Effect                                             | Recommendation                       |
|-----------------------------|-----------------------------------------------------|--------------------------------------|
| `shadow_bias`               | Prevents self-shadowing (shadow acne)               | Start at 0.1, increase if acne visible |
| `shadow_normal_bias`        | Better acne fix than regular bias                   | Prefer this over `shadow_bias`       |
| `directional_shadow_max_distance` | Limits shadow range from camera               | Lower = better quality; 50–100m typical |
| Shadow map resolution       | Project Settings > Rendering > Lights and Shadows  | 2048 for perf, 4096 for quality      |
| `shadow_blur`               | Softens shadow edges                                | 1.0–2.0 for gentle softness         |

### Light Bake Modes

| Mode     | Description                                               | Use For                             |
|----------|-----------------------------------------------------------|-------------------------------------|
| Disabled | Not included in lightmap baking; fully real-time (default) | Moving lights, player flashlight    |
| Static   | Fully baked into lightmaps — no runtime cost              | Architecture, terrain, fixed lights |
| Dynamic  | Indirect light baked, direct light stays real-time        | Lights that change color/intensity  |

---

## 4. Environment & Post-Processing

Configure global rendering — sky background, tonemapping, glow, SSR, SSAO/SSIL/SDFGI, depth-of-field — through a `WorldEnvironment` node holding an `Environment` resource. Pick a tonemap (`Linear`, `Reinhard`, `Filmic`, `ACES`, or `AgX`) on the Environment resource. Forward+ enables SSAO, SSIL, SSR, and SDFGI; mobile/compatibility renderers omit these.

> See [references/environment-and-post.md](references/environment-and-post.md) for the full setup recipes (sky options, tonemap modes, all post-processing effects, the 4.6+ glow-before-tonemapping pipeline change, AgX `tonemap_white` / `tonemap_contrast` controls, and the 4.6+ SSR quality upgrade).

## 5. Global Illumination

Five GI options trade quality for cost: none (ambient only) → ReflectionProbe (localized) → LightmapGI (best quality, baked) → VoxelGI (small/medium dynamic) → SDFGI (large open-world). VoxelGI/SDFGI/LightmapGI require Forward+. The 4.5+ subsections below (Specular Occlusion, Bent Normal Maps) stay inline because they apply across GI methods.

> See [references/global-illumination.md](references/global-illumination.md) for the methods comparison table, ReflectionProbe scene + code recipe, LightmapGI bake workflow, and SDFGI configuration.

### Specular Occlusion from Ambient Light (Godot 4.5+)

Godot 4.5+ automatically computes specular occlusion from the ambient light probe when **LightmapGI**, **VoxelGI**, or **SDFGI** is active. Prevents unrealistically bright speculars in areas that receive little indirect light (under eaves, inside crevices, in corners). No API change — re-bake after upgrading to see the improvement on metallic / low-roughness surfaces. ReflectionProbe alone does not provide specular occlusion.

### Bent Normal Maps (Godot 4.5+)

Bent normal maps encode the mean unoccluded direction from each texel — the average direction toward open sky across the hemisphere. When assigned to the **Bent Normal** slot on `StandardMaterial3D`, Godot uses this information to improve indirect lighting directionality and specular occlusion accuracy. The result is more realistic ambient lighting on complex surfaces like cloth, carved stone, or organic shapes.

**Inspector setup:** In `StandardMaterial3D`, enable **Bent Normal** → assign your tangent-space bent normal texture (baked from Marmoset, Substance, or xNormal).

> **Most visible on:** materials that combine low roughness or high metallic values with baked GI (LightmapGI / VoxelGI / SDFGI). On fully rough dielectric surfaces the benefit is subtler. Use on hero assets; skip on background geometry.

> See [references/materials-and-lighting-recipes.md](references/materials-and-lighting-recipes.md) for the runtime-assignment GDScript + C# code path (the Inspector setup above is the typical case).

---

## 6. Fog

Three layers: depth/height fog set on `WorldEnvironment.environment` (cheap, all renderers), volumetric fog (Forward+ only — godrays through depth), and `FogVolume` nodes for localized fog effects (interior rooms, pits, atmospheric volumes).

> See [references/fog-recipes.md](references/fog-recipes.md) for the full GDScript and C# recipes — depth/height fog setup, volumetric fog parameters and performance notes, and FogVolume placement.

## 7. Decals

`Decal` nodes project a texture onto whatever surfaces fall within their bounding box — bullet holes, blood splatter, ground details, signage. All renderers support decals; performance scales with overdraw and decal count.

> See [references/decals.md](references/decals.md) for the scene setup, runtime spawning recipe (GDScript + C#), and the per-renderer decal limits.

---

## 8. Optimization — LOD, Culling, MultiMesh

Four tools: automatic mesh LOD (set on import or per `MeshInstance3D`), manual `VisibilityRange` for staged swaps, occlusion culling via `OccluderInstance3D`, and `MultiMeshInstance3D` for thousands of identical meshes in one draw call.

> See [references/lod-and-culling.md](references/lod-and-culling.md) for setup recipes for each tool plus the MultiMesh runtime population example.

## 9. Renderer Comparison

| Feature | Forward+ | Mobile | Compatibility |
|---|---|---|---|
| SSAO / SSIL / SSR / Volumetric Fog / SDFGI / VoxelGI | Yes | No | No |
| LightmapGI / Glow / Bloom | Yes | Yes | Yes |
| Max Omni+Spot per mesh | 512 clustered | 8+8 | 8+8 (adjustable) |
| Target | Desktop/Console | Mobile/Mid-range | Low-end/WebGL |

Choose in **Project Settings → Rendering → Renderer → Rendering Method**. Rule of thumb: Forward+ for desktop, Mobile for mobile, Compatibility only for web or very low-end hardware.

---

## 10. Common Pitfalls

| Symptom                              | Cause                                          | Fix                                                              |
|--------------------------------------|-------------------------------------------------|------------------------------------------------------------------|
| 3D scene is completely black         | No Camera3D or no lights in scene               | Add Camera3D + DirectionalLight3D + WorldEnvironment             |
| Objects appear dark despite lighting | No ambient light or sky                          | Set Environment ambient_light_source to Sky or Color             |
| Shadow acne (striped shadows)        | Shadow bias too low                              | Increase `shadow_normal_bias` (preferred over `shadow_bias`)     |
| Peter-panning (shadows detached)     | Shadow bias too high                             | Lower `shadow_bias`; use `shadow_normal_bias` instead            |
| Shadows pop in/out                   | `directional_shadow_max_distance` too high       | Lower to 50–100m; quality improves as range shrinks              |
| Material looks flat / no reflections | Missing ReflectionProbe or Sky                   | Add ReflectionProbe or set Environment reflected light to Sky    |
| Decals don't appear                  | Y extent too small or wrong cull mask            | Increase Decal Y size; check cull mask matches target layer      |
| Transparency sorting artifacts       | Overlapping transparent meshes                   | Use Alpha Scissor/Hash where possible; avoid layered transparency |
| SDFGI shows light leaking           | Thin walls or small geometry                     | Thicken walls; increase SDFGI cascade count                      |
| Volumetric fog not visible           | Wrong renderer (Mobile/Compatibility)            | Switch to Forward+ renderer                                      |
| MultiMesh instances invisible         | `instance_count` set after transforms           | Set `instance_count` before calling `set_instance_transform()`   |

---

## 11. Implementation Checklist

- [ ] Scene has Camera3D, at least one light source, and WorldEnvironment
- [ ] Environment has a sky material (procedural or HDR panorama) for ambient and reflected light
- [ ] Tonemap mode is set (Filmic or ACES for realistic look, AgX for physically accurate)
- [ ] DirectionalLight3D has shadows enabled with `shadow_normal_bias` tuned to prevent acne
- [ ] `directional_shadow_max_distance` is set to the minimum needed (50–100m typical)
- [ ] Static geometry uses StandardMaterial3D with appropriate PBR textures (albedo, normal, roughness, metallic)
- [ ] Transparent materials use Alpha Scissor or Alpha Hash instead of Alpha where possible (performance + shadows)
- [ ] ReflectionProbes are placed in rooms/areas with reflective surfaces
- [ ] GI method chosen based on project needs (LightmapGI for static, SDFGI for large dynamic, VoxelGI for small dynamic)
- [ ] Mesh LOD is enabled on import (default for glTF/Blend — verify OBJ files)
- [ ] Occlusion culling is enabled and baked for scenes with heavy occlusion (indoor, urban)
- [ ] MultiMeshInstance3D is used for instanced geometry (grass, trees, props) instead of individual nodes
- [ ] Renderer matches target platform (Forward+ desktop, Mobile mobile, Compatibility web)
- [ ] Projects using LightmapGI/VoxelGI/SDFGI take advantage of automatic specular occlusion by upgrading to Godot 4.5+ (no API change required)
- [ ] Hero assets with complex surface detail use bent normal maps in the StandardMaterial3D Bent Normal slot for improved indirect lighting (Godot 4.5+)
- [ ] After upgrading to Godot 4.6, glow settings are re-tuned if appearance has changed (glow now runs before tonemapping)
- [ ] AgX `tonemap_white` and `tonemap_contrast` are adjusted when using AgX tonemapper for precise look control (Godot 4.6+)
