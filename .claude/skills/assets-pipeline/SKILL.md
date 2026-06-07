---
name: assets-pipeline
description: Use when importing and managing assets — image compression, 3D scene import, audio formats, resource formats, and import configuration
---

# Assets Pipeline in Godot 4.3+

All examples target Godot 4.3+ with no deprecated APIs. GDScript is shown first, then C#.

> **Related skills:** **audio-system** for audio playback and bus architecture, **3d-essentials** for 3D materials and lighting, **2d-essentials** for 2D rendering and sprites, **animation-system** for imported animations, **godot-optimization** for asset-related performance, **multithreading** for threaded resource loading.

---

## 1. How Importing Works

### The Import System

When you add a file to `res://`, Godot auto-imports it based on its type. Import settings are stored in `.import` sidecar files alongside the original.

```
project/
├── textures/
│   ├── player.png           ← original file (committed to VCS)
│   └── player.png.import    ← import settings (committed to VCS)
└── .godot/
    └── imported/            ← compiled cache (NOT committed — .gitignore it)
```

### Key Rules

- **Never modify files in `.godot/imported/`** — they are regenerated from originals
- **Commit `.import` files** to version control — they store your settings
- **Reimport** after changing settings: select file → Import dock → click **Reimport**
- `.godot/` should be in your `.gitignore`

### Changing Import Settings

1. Select the file in the **FileSystem** dock
2. Open the **Import** dock (next to Scene dock by default)
3. Change settings
4. Click **Reimport** (or **Reimport All** for batch changes)

> Import settings can also be set via **Advanced Import Settings** for 3D scenes (double-click the `.glb`/`.gltf` file).

---

## 2. Image Import

### Compression Modes

| Mode           | Quality   | VRAM     | File Size | Use For                         |
|----------------|-----------|----------|-----------|----------------------------------|
| **Lossless**   | Perfect   | High     | Large     | Pixel art, UI elements           |
| **Lossy**      | Good      | High     | Small     | Large photos, backgrounds        |
| **VRAM Compressed** | Reduced | Low   | Small     | 3D textures, large 2D sprites    |
| **VRAM Uncompressed** | Perfect | High | Large    | When VRAM compression artifacts are unacceptable |
| **Basis Universal** | Reduced | Low  | Very small | Cross-platform, multiple GPU formats |

### When to Use Each

```
Pixel art / UI icons       → Lossless (no artifacts, crisp pixels)
2D game sprites            → Lossless (small sprites) or VRAM Compressed (large sprites)
3D textures (albedo, normal) → VRAM Compressed (saves GPU memory)
Large backgrounds          → Lossy or VRAM Compressed
Mobile targets             → VRAM Compressed (essential for memory)
```

### Key Import Settings

| Setting            | Description                                   | Default     |
|--------------------|-----------------------------------------------|-------------|
| **Compress > Mode** | Compression algorithm (see table above)      | VRAM Compressed |
| **Mipmaps > Generate** | Generate mipmaps for distance rendering   | Off         |
| **Process > Fix Alpha Border** | Prevents dark outlines on transparent sprites | On    |
| **Process > Premult Alpha** | Pre-multiply alpha (avoids dark halos)   | Off         |
| **Flags > Filter** | Bilinear filtering (smooth) vs nearest (crisp) | Linear    |
| **Flags > Repeat** | Enable texture tiling                        | Disabled    |

### Pixel Art Setup

For crisp pixel art, set these project-wide:

**Project Settings > Rendering > Textures > Canvas Textures > Default Texture Filter** → `Nearest`

Or per-image in Import dock: **Filter** → `Nearest`

### Enabling Mipmaps

Mipmaps prevent shimmering on textures viewed at an angle or from a distance. Required for 3D textures; optional for 2D.

- **3D textures:** Always enable mipmaps (Import dock → Mipmaps → Generate → On)
- **2D sprites:** Usually off (unless you use Camera2D zoom)
- **UI textures:** Off (rendered at fixed scale)

---

## 3. 3D Scene Import

### Supported Formats

| Format    | Extension    | Recommendation                              |
|-----------|-------------|----------------------------------------------|
| **glTF**  | `.gltf`, `.glb` | **Recommended** — open standard, best support |
| **Blend** | `.blend`    | Direct Blender import (requires Blender installed) |
| **FBX**   | `.fbx`      | Good for legacy pipelines                    |
| **Collada** | `.dae`    | Older format, use glTF if possible           |
| **OBJ**   | `.obj`      | Static meshes only — no animations/rigs      |

> **glTF is the recommended format.** It has the best Godot support, is an open standard, and preserves materials, animations, and rigs accurately.

### Node Naming Conventions

Godot auto-creates appropriate node types based on **suffixes** in your 3D model's object names:

| Suffix                | Generated Node            | Example Name               |
|-----------------------|---------------------------|----------------------------|
| `-col`                | StaticBody3D + collision  | `Wall-col`                 |
| `-convcol`            | ConvexPolygonShape3D      | `Rock-convcol`             |
| `-rigid`              | RigidBody3D               | `Barrel-rigid`             |
| `-navmesh`            | NavigationRegion3D        | `Floor-navmesh`            |
| `-occluder`           | OccluderInstance3D        | `BigWall-occluder`         |

```
In Blender:                  In Godot (after import):
Wall-col                  →  StaticBody3D
├── Wall (mesh)           →    ├── MeshInstance3D
                          →    └── CollisionShape3D (auto-generated)
```

### Import Dock Settings

Select the imported `.glb`/`.gltf` in FileSystem, then in the Import dock:

| Setting                    | Description                                      |
|----------------------------|--------------------------------------------------|
| **Root Type**              | Override root node type (Node3D, RigidBody3D, etc.) |
| **Root Name**              | Custom name for the root node                    |
| **Meshes > Generate LOD**  | Auto-generate LOD levels (on by default)         |
| **Meshes > Light Baking**  | Static or Dynamic for lightmap baking            |
| **Animation > Import**     | Enable/disable animation import                 |
| **Animation > FPS**        | Bake animation at this framerate                 |

### Runtime Scene Loading

```gdscript
# Preload at compile time (known path)
const ENEMY_SCENE: PackedScene = preload("res://models/enemy.glb")

# Load at runtime (path from data)
func spawn_model(path: String) -> Node3D:
    var scene: PackedScene = load(path)
    var instance: Node3D = scene.instantiate()
    add_child(instance)
    return instance
```

```csharp
private static readonly PackedScene EnemyScene = GD.Load<PackedScene>("res://models/enemy.glb");

public Node3D SpawnModel(string path)
{
    var scene = GD.Load<PackedScene>(path);
    var instance = scene.Instantiate<Node3D>();
    AddChild(instance);
    return instance;
}
```

---

## 4. Animation Import

### Splitting Animations

If a 3D file contains a single timeline with multiple animations, split them in the **Advanced Import Settings**:

1. Double-click the `.glb` file to open Advanced Import Settings
2. Go to **Animations** tab
3. Add animation clips with **start frame** and **end frame**
4. Set **loop mode** per clip (None, Linear, Ping-Pong)

### Retargeting Animations

Share animations between characters with different skeletons:

1. Import both the source (animation) and target (character) models
2. Open **Advanced Import Settings** on the target model
3. Go to **Skeleton3D > Retarget** settings
4. Map source bones to target bones
5. Use `SkeletonProfile` resources for standard humanoid mappings

### Animation Import Settings

| Setting               | Description                              |
|-----------------------|------------------------------------------|
| **Import**            | Enable/disable animation import          |
| **FPS**               | Bake framerate (30 is standard)          |
| **Trimming**          | Remove empty frames at start/end         |
| **Remove Immutable Tracks** | Remove tracks that don't change  |

---

## 5. Audio Import

> For in-depth audio playback, bus setup, and music management, see the **audio-system** skill.

### Format Recommendations

| Format | Import As       | Use For                   | Key Settings            |
|--------|-----------------|---------------------------|-------------------------|
| WAV    | AudioStreamWAV  | Short SFX                 | Loop Mode, Mix Rate     |
| OGG    | AudioStreamOggVorbis | Music, long SFX      | Loop, Loop Offset       |
| MP3    | AudioStreamMP3  | Music (fallback)          | Loop, BPM               |

### Key Import Settings

| Setting       | Description                                    | When to Use             |
|---------------|------------------------------------------------|-------------------------|
| **Loop**      | Enable looping playback                        | Music, ambient loops    |
| **Loop Offset** | Start position for loop restart             | Avoid intro on loop     |
| **Force Mono** | Convert stereo to mono                        | 3D positional audio     |
| **BPM**       | Beats per minute                               | Rhythm games            |
| **Beat Count** | Total beats in the track                      | Rhythm sync             |

> **Import tip:** Use WAV for short SFX (zero decode latency). Use OGG for music (small file, good quality). Enable **Force Mono** for any audio used with AudioStreamPlayer3D — stereo doesn't spatialize properly.

---

## 6. Resource Formats

### .tres vs .res

| Format | Type       | Readable | Use For                              |
|--------|------------|----------|--------------------------------------|
| `.tres` | Text      | Yes      | Resources you edit by hand or diff   |
| `.res`  | Binary    | No       | Large resources, faster loading      |

```gdscript
# Save as text resource
ResourceSaver.save(my_resource, "res://data/item.tres")

# Save as binary resource
ResourceSaver.save(my_resource, "res://data/item.res")

# Load (either format)
var resource: Resource = load("res://data/item.tres")
```

```csharp
ResourceSaver.Save(myResource, "res://data/item.tres");
ResourceSaver.Save(myResource, "res://data/item.res");
var resource = GD.Load<Resource>("res://data/item.tres");
```

### When to Use Each

- **`.tres`** — Custom resources you create and edit (item data, config, skill definitions). Version control friendly.
- **`.res`** — Generated or large binary data (baked lightmaps, navigation meshes, large meshes). Faster to load.
- **`.tscn`** — Text scene files (always use text for scenes — diffable in VCS)
- **`.scn`** — Binary scene files (rare — only for very large scenes where load time matters)

### Threaded Resource Loading

Load large resources without freezing the game:

```gdscript
func load_level_async(path: String) -> void:
    ResourceLoader.load_threaded_request(path)

func _process(delta: float) -> void:
    var status := ResourceLoader.load_threaded_get_status(_loading_path)
    match status:
        ResourceLoader.THREAD_LOAD_IN_PROGRESS:
            var progress: Array = []
            ResourceLoader.load_threaded_get_status(_loading_path, progress)
            loading_bar.value = progress[0] * 100.0
        ResourceLoader.THREAD_LOAD_LOADED:
            var scene: PackedScene = ResourceLoader.load_threaded_get(_loading_path)
            get_tree().change_scene_to_packed(scene)
        ResourceLoader.THREAD_LOAD_FAILED:
            push_error("Failed to load: %s" % _loading_path)
```

```csharp
public void LoadLevelAsync(string path)
{
    ResourceLoader.LoadThreadedRequest(path);
}

public override void _Process(double delta)
{
    var progress = new Godot.Collections.Array();
    var status = ResourceLoader.LoadThreadedGetStatus(_loadingPath, progress);
    switch (status)
    {
        case ResourceLoader.ThreadLoadStatus.InProgress:
            loadingBar.Value = (float)progress[0] * 100.0f;
            break;
        case ResourceLoader.ThreadLoadStatus.Loaded:
            var scene = ResourceLoader.LoadThreadedGet(_loadingPath) as PackedScene;
            GetTree().ChangeSceneToPacked(scene);
            break;
        case ResourceLoader.ThreadLoadStatus.Failed:
            GD.PushError($"Failed to load: {_loadingPath}");
            break;
    }
}
```

---

## 7. Common Pitfalls

| Symptom                               | Cause                                       | Fix                                                               |
|---------------------------------------|----------------------------------------------|--------------------------------------------------------------------|
| Texture looks blurry                  | Filter is set to Linear for pixel art        | Set Default Texture Filter to Nearest in Project Settings          |
| Dark outlines on transparent sprites  | Alpha border not fixed on import             | Enable "Fix Alpha Border" in Import dock                           |
| 3D model has no collisions            | No naming suffix in source model             | Add `-col` suffix to mesh names in Blender, or add manually       |
| Imported animations missing           | "Import Animation" disabled in Import dock   | Enable Animation > Import and reimport                             |
| Texture VRAM too high on mobile       | Using Lossless compression for large textures | Switch to VRAM Compressed for textures > 256px                    |
| 3D textures shimmer at distance       | Mipmaps not generated                        | Enable Mipmaps > Generate in Import dock                           |
| Audio has pop/click at loop point     | Loop offset not set correctly                | Adjust Loop Offset in Import dock; add fade in audio editor       |
| Scene file is enormous                | Using binary `.scn` instead of `.tscn`       | Save scenes as `.tscn` (text) for VCS; use `.scn` only if needed  |
| Import settings lost after reclone    | `.import` files not committed to VCS         | Always commit `.import` files; only `.godot/` goes in .gitignore  |
| Threaded load freezes game            | Checking status every frame with `load()`    | Use `ResourceLoader.load_threaded_request/get_status` pattern      |

---

## 8. Implementation Checklist

- [ ] `.gitignore` excludes `.godot/` but NOT `.import` files
- [ ] Pixel art projects set Default Texture Filter to `Nearest` in Project Settings
- [ ] 3D textures have mipmaps enabled (Import dock → Mipmaps → Generate)
- [ ] Large textures use VRAM Compressed (especially on mobile targets)
- [ ] 3D models use glTF format (`.glb` or `.gltf`) as the primary import format
- [ ] Collision shapes use naming suffixes (`-col`, `-convcol`) in the 3D authoring tool
- [ ] Animations are split into individual clips in Advanced Import Settings
- [ ] Audio SFX uses WAV; music uses OGG Vorbis
- [ ] 3D positional audio files are imported as mono (Force Mono enabled)
- [ ] Custom data resources use `.tres` (text) for version control diffability
- [ ] Large or runtime-loaded resources use `ResourceLoader.load_threaded_request()`
- [ ] Scene files use `.tscn` (text format) for version control
