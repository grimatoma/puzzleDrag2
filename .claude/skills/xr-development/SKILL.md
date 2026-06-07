---
name: xr-development
description: Use when building VR/AR/XR applications — OpenXR setup, XROrigin3D, hand tracking, controllers, passthrough, and Meta Quest deployment in Godot 4.3+
---

# XR Development in Godot 4.3+

All examples target Godot 4.3+ with no deprecated APIs. GDScript is shown first, then C#.

> **Related skills:** **3d-essentials** for 3D rendering and environment, **physics-system** for 3D physics interactions, **input-handling** for non-XR input patterns, **export-pipeline** for platform exports.

---

## 1. XR Setup

### Enabling OpenXR

1. **Project Settings → Plugins → Enable:** `OpenXR` (or `OpenXR Plugin` depending on version)
2. **Project Settings → XR → OpenXR → Enabled** → `true`
3. **Project Settings → XR → Shaders → Enabled** → `true` (for XR shader support)
4. **Rendering:**
   - Use **Forward+** or **Mobile** renderer (Compatibility also works for simpler scenes)
   - Set **Project Settings → Display → Window → VSync Mode** to `Disabled` (the XR runtime controls frame timing)

### Core Scene Structure

```
Main (Node3D)
├── XROrigin3D                    ← Player's physical space origin
│   ├── XRCamera3D                ← Head-mounted display
│   ├── XRController3D (left)     ← Left controller
│   │   └── LeftHandModel (MeshInstance3D or hand tracking)
│   ├── XRController3D (right)    ← Right controller
│   │   └── RightHandModel
│   └── (XRBodyTracker via XRServer — optional full body tracking)
├── WorldEnvironment
└── GameWorld (Node3D)
    └── ... level geometry
```

### Starting XR Session

```gdscript
extends Node3D

func _ready() -> void:
    var xr_interface: XRInterface = XRServer.find_interface("OpenXR")
    if xr_interface and xr_interface.is_initialized():
        get_viewport().use_xr = true
    else:
        push_error("OpenXR not available")
```

```csharp
public partial class XRMain : Node3D
{
    public override void _Ready()
    {
        var xrInterface = XRServer.FindInterface("OpenXR");
        if (xrInterface != null && xrInterface.IsInitialized())
            GetViewport().UseXr = true;
        else
            GD.PushError("OpenXR not available");
    }
}
```

---

## 2. Controllers and Input

`XRController3D` nodes (one per hand, child of `XROrigin3D`) expose buttons via the OpenXR action map. Common buttons: trigger (`select_button`), grip (`grip_button`), thumbstick (`primary_axis` Vector2). Apply thumbstick locomotion velocity to `XROrigin3D` (not the camera).

> See [references/controllers-and-input.md](references/controllers-and-input.md) for full XRController3D wiring, OpenXR button reference, and thumbstick locomotion recipe.

---

## 3. Hand Tracking

When the headset supports hand tracking (Quest 2+, Vision Pro), `XRController3D` nodes can be configured to track hand joints. Sample finger positions for gesture detection, or bind to standard select / grip events when the user pinches.

> See [references/hand-tracking.md](references/hand-tracking.md) for hand-tracking node setup, joint sampling, and gesture-driven interactions.

---

## 4. Grabbing Objects

Standard pattern: an `Area3D` on the controller detects nearby `RigidBody3D` objects; on grip-press, parent the body to the controller and freeze it; on grip-release, restore the parent and apply the controller's velocity to launch.

> See [references/grabbing-objects.md](references/grabbing-objects.md) for the full physics-based grabbing implementation (GDScript + C#).

---

## 5. XR UI Interaction

For UI in VR, render a `Control` tree to a `SubViewport`, map its texture onto a `Quad` mesh placed in 3D space. Pointer: a `RayCast3D` from the controller hits the quad, the hit position is converted back to 2D viewport coords, an `InputEventMouseMotion` is forwarded into the SubViewport.

> See [references/xr-ui.md](references/xr-ui.md) for the SubViewport-on-quad recipe and pointer/ray interaction.

---

## 6. Passthrough (Mixed Reality)

For headsets that support it (Quest 2+, Vision Pro), set `OpenXRInterface.environment_blend_mode = XR_ENVIRONMENT_BLEND_MODE_ALPHA_BLEND` and clear the `WorldEnvironment` background to transparent. The user sees the real world with virtual content composited on top.

> See [references/passthrough.md](references/passthrough.md) for the full enabling steps and Quest-specific notes.

---

## 7. Meta Quest Export

### Setup

1. Install Android Build Template: **Project → Install Android Build Template**
2. Install OpenXR Vendors plugin: **Project → Project Settings → Plugins → Enable `Godot OpenXR Vendors`** (or install from AssetLib)
3. **Export → Add → Android**
4. In the Android export preset:
   - **XR Features → XR Mode** → `OpenXR`
   - **XR Features → Hand Tracking** → `Optional` or `Required`
   - **XR Features → Passthrough** → `Optional` (if needed)
   - **Architectures → arm64** → enabled (Quest is ARM)
5. Set minimum API level to 29+

### Performance Settings for Quest

| Setting | Recommended Value |
|---------|-------------------|
| Renderer | Mobile |
| MSAA | 2x or 4x (VR needs antialiasing) |
| Texture Compression | ETC2/ASTC |
| Target FPS | 72 (Quest 2) or 90 (Quest 3) |

> **Critical:** VR must maintain consistent frame rate. Dropped frames cause nausea. Profile aggressively and keep draw calls low.

---

## 8. Godot 4.5+ XR Features

### D3D12 OpenXR Backend (Windows) (Godot 4.5+)

On Windows, Godot 4.5 adds a Direct3D 12 rendering backend for OpenXR. Previously, Windows XR builds required Vulkan. D3D12 is relevant for Quest Link and SteamVR on machines with good D3D12 driver support.

**Enable in Project Settings:**

1. **Project Settings → Rendering → Rendering Device → Driver** → select `D3D12` (Windows only)
2. Re-export the Windows build — no code changes required.

> **When to use D3D12:** If your target audience runs Quest Link or SteamVR on Windows and encounters Vulkan driver issues, D3D12 can be more stable. Vulkan remains the default and is typically preferred for performance.

---

### Foveated Rendering on Mobile Vulkan (Godot 4.5+)

Standalone VR headsets (Meta Quest, Pico) running the **Mobile Vulkan** renderer now support foveated rendering via the `VK_EXT_fragment_density_map` extension. The peripheral view is rendered at lower resolution while the foveal region stays sharp, significantly reducing GPU load.

**Enable via the OpenXR Vendors plugin:**

1. Install or update the **Godot OpenXR Vendors** plugin (Project Settings → Plugins).
2. In the Android export preset, ensure **Renderer** is set to **Mobile** (not Forward+).
3. In the vendor plugin settings, enable **Foveated Rendering** and choose a density level (e.g., `LOW`, `MEDIUM`, `HIGH`).
4. The `VK_EXT_fragment_density_map` device extension is requested automatically by the plugin at runtime — no Vulkan code needed.

> **Note:** Foveated rendering requires the Mobile Vulkan renderer. It has no effect on the Forward+ renderer or on PC VR headsets. Test GPU utilization with and without it on device using Meta's OVR Metrics Tool or Pico's equivalents.

---

### Application SpaceWarp (ASW) (Godot 4.5+)

Application SpaceWarp is a frame-synthesis technique supported on Meta Quest and Pico headsets. The GPU renders every other frame at half rate; the SpaceWarp runtime synthesizes the missing frames using motion vectors. This halves the rendering budget while maintaining perceived smoothness.

**Enable via the OpenXR Vendors plugin:**

1. Update to **Godot OpenXR Vendors** plugin 4.x (supports ASW).
2. In the Android export preset extras, enable **Application SpaceWarp**.
3. Ensure the **Motion Vectors** rendering pass is active — the vendor plugin enables this automatically when ASW is on.
4. Set your target frame rate to **half the native headset rate** (e.g., 40 Hz on Quest 3 at 80 Hz mode) in your XR session configuration.

> **Caution:** SpaceWarp can introduce ghosting artifacts on fast-moving objects. Disable per-object if you see visual glitches. Test thoroughly on device.

---

### OpenXR Render Models (Godot 4.5+)

The OpenXR Render Models extension lets the platform supply animated, branded controller meshes at runtime. You no longer need to bundle Quest Touch or Pico controller meshes in your project.

**Enable:**

1. Update to **Godot OpenXR Vendors** plugin 4.x.
2. In Project Settings (or via the vendor plugin toggle), enable **OpenXR Render Models**.
3. In your scene, add `OpenXRRenderModel` nodes as children of each `XRController3D` — the plugin populates them with the platform-native mesh automatically.

```gdscript
# The render model node auto-populates; no manual mesh assignment needed.
# You can show/hide it to toggle between your own model and the platform model:
@onready var render_model: Node3D = $XRController3D/OpenXRRenderModel

func _ready() -> void:
    render_model.visible = true  # Use platform-native controller model
```

```csharp
// The render model node auto-populates; no manual mesh assignment needed.
[Export] public Node3D RenderModel { get; set; }

public override void _Ready()
{
    RenderModel.Visible = true; // Use platform-native controller model
}
```

> **Availability:** Render Models require the platform runtime to support the `XR_EXT_hand_tracking_data_source` or equivalent render model extension. Confirmed on Meta Quest and Pico runtimes. Fall back to bundled meshes when the node has no mesh loaded.

---

### visionOS Export (Godot 4.5+)

Godot 4.5 adds native **visionOS** (Apple Vision Pro) export via the unified "Apple Embedded" platform driver. Windowed visionOS apps (running in the Shared Space) can be exported directly without additional tooling beyond Xcode.

**Setup:**

1. Ensure you have Xcode 15.4+ with the visionOS SDK installed.
2. In **Export → Add Preset**, select **Apple Embedded** — it covers iOS, iPadOS, and visionOS.
3. Set **Target SDK** to `visionOS` in the preset options.
4. For XR content in visionOS Full Space, use OpenXR with the appropriate entitlements — see Apple's documentation for `ARKit` + `Passthrough` entitlements.
5. Build and deploy via Xcode as usual.

> **Note:** visionOS Full Space XR (immersive mode) requires Apple's `com.apple.developer.arkit` entitlement and is distinct from windowed Shared Space mode. The OpenXR path on visionOS mirrors the passthrough workflow in Section 6.

---

## 9. Godot 4.6+ XR Features

### OpenXR 1.1 Support (Godot 4.6+)

Godot 4.6 ships with native OpenXR 1.1 runtime support. Devices and runtimes that implement OpenXR 1.1 automatically unlock 1.1 features (improved compositor layers, updated interaction profiles, etc.) without any project-level change. No API change is required — the engine negotiates the spec version with the runtime at startup.

> **Note:** OpenXR 1.1 was introduced in Godot 4.6 (beta as of this writing). API behaviour may evolve before the stable release — see https://godotengine.org/article/dev-snapshot-godot-4-6-beta-1/ for current details.

---

### Spatial Entities — Anchors, Plane Tracking, Marker Tracking (Godot 4.6+)

Godot 4.6 stabilises the **XR Spatial Entities** extension, enabling:

- **Spatial anchors** — persist virtual object positions across sessions (`XRSpatialAnchor`)
- **Plane detection** — detect floor, wall, and ceiling surfaces from the environment scan
- **Marker tracking** — track QR codes or image markers in the scene

**Basic spatial anchor usage:**

```gdscript
# Requires: OpenXR Spatial Entities extension enabled in the vendor plugin
# XRSpatialAnchor is a Node3D placed in your scene that the runtime keeps locked
# to a real-world location.

extends Node3D

@export var anchor_scene: PackedScene  # Scene containing XRSpatialAnchor

func place_anchor_at(world_position: Vector3) -> void:
    var anchor: XRSpatialAnchor = XRSpatialAnchor.new()
    anchor.position = world_position
    add_child(anchor)
    # The XR runtime takes over tracking once the node is added to the scene tree.
    # Persist the anchor UUID to restore it on next launch (platform-specific API).
```

```csharp
// Requires: OpenXR Spatial Entities extension enabled in the vendor plugin
public partial class SpatialAnchorManager : Node3D
{
    public void PlaceAnchorAt(Vector3 worldPosition)
    {
        var anchor = new XRSpatialAnchor();
        anchor.Position = worldPosition;
        AddChild(anchor);
        // The XR runtime takes over tracking once added to the scene tree.
        // Persist anchor UUID via platform-specific API for cross-session recall.
    }
}
```

> **Note:** `XRSpatialAnchor`, plane tracking, and marker tracking APIs were introduced in Godot 4.6 (beta as of this writing). The full API surface — especially persistence, query callbacks, and plane/marker node types — may change before the stable release. See https://godotengine.org/article/dev-snapshot-godot-4-6-beta-1/ for current signatures and the Godot OpenXR Vendors plugin for platform-specific spatial entity setup.

---

## 10. Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| Black screen in headset | `use_xr = true` not set on viewport | Set in `_ready()` after checking XR interface |
| Controller input not firing | Wrong signal name for the platform | Check OpenXR action map bindings in Project Settings |
| Objects scale wrong in VR | Scene not built at real-world scale | Use 1 unit = 1 meter throughout the scene |
| Motion sickness from locomotion | Smooth rotation | Use snap turning (30° increments) or add a vignette during movement |
| UI unreadable in VR | Panel too far away or too small | Place UI at 1–2m distance, use SubViewport at 1024+ resolution |
| Hand tracking jittery | Raw joint data used directly | Apply smoothing (lerp toward new position each frame) |
| Export fails on Quest | Missing Android build template or wrong architecture | Install Android Build Template; enable arm64; set API level 29+ |

---

## 11. Implementation Checklist

- [ ] OpenXR is enabled in Project Settings
- [ ] Scene uses `XROrigin3D` → `XRCamera3D` + `XRController3D` hierarchy
- [ ] XR session is started with `get_viewport().use_xr = true` after interface check
- [ ] World is built at 1 unit = 1 meter scale
- [ ] Controller input uses OpenXR action names (`trigger_click`, `grip_click`, etc.)
- [ ] Fallback exists for hand tracking → controller tracking
- [ ] UI panels use SubViewport rendered on a 3D mesh
- [ ] Locomotion includes comfort options (snap turn, vignette)
- [ ] VSync is disabled (XR runtime handles frame timing)
- [ ] Quest export uses Mobile renderer, arm64 architecture, API level 29+
- [ ] On Windows Quest Link / SteamVR builds, consider D3D12 backend if Vulkan drivers are problematic (Godot 4.5+)
- [ ] Foveated rendering enabled via OpenXR Vendors plugin for standalone Quest/Pico targets (Godot 4.5+)
- [ ] Application SpaceWarp evaluated for performance budget on Meta Quest / Pico targets (Godot 4.5+)
- [ ] OpenXR Render Models used for controller visuals instead of bundled meshes where supported (Godot 4.5+)
- [ ] visionOS export uses the Apple Embedded preset with visionOS SDK target (Godot 4.5+)
- [ ] Spatial anchors use `XRSpatialAnchor` and vendor plugin spatial entities extension (Godot 4.6+)
