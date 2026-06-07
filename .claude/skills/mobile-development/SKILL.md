---
name: mobile-development
description: Use when targeting Android/iOS — export and signing, permissions, plugins, in-app purchases, ads, app lifecycle, device features, and mobile performance
---

# Mobile Development

Ship a Godot 4.x game to Android and iOS. This covers the platform-specific deltas beyond a generic export: signing, lifecycle, permissions, plugins, IAP, device features, and the mobile renderer/perf budget.

> **Related skills:** **export-pipeline** for the generic export flow and CI/CD, **responsive-ui** for safe-area layout, **input-handling** for touch, **godot-optimization** for mobile performance, **csharp-godot** for C# mobile caveats.

---

## 1. Export & signing

**Android:** OpenJDK 17 and the Android SDK; set `Java SDK Path` + `Android SDK Path` in **Editor Settings** (per-user, not per-project). Generate a release keystore:

```bash
keytool -v -genkey -keystore mygame.keystore -alias mygame -keyalg RSA -validity 10000
```

Preset fields: **Release / Release User / Release Password** (keystore and key passwords must currently match); uncheck **Export With Debug**. **AAB is mandatory for new Play uploads.** CI env overrides: `GODOT_ANDROID_KEYSTORE_RELEASE_{PATH,USER,PASSWORD}`.

**iOS:** macOS + Xcode. Export needs an **App Store Team ID** + a reverse-DNS bundle **Identifier**; Godot generates an `.xcodeproj` you build from Xcode. The iOS **simulator supports the Compatibility renderer only**.

A **custom Gradle build** (*Project → Install the Gradle Build template*) is **required for v2 plugins and IAP** (Godot 4.2+).

---

## 2. App lifecycle

Real `Node` notification constants: `NOTIFICATION_APPLICATION_PAUSED` (2015), `NOTIFICATION_APPLICATION_RESUMED` (2014), `NOTIFICATION_APPLICATION_FOCUS_IN`/`_OUT` (2016/2017), `NOTIFICATION_WM_GO_BACK_REQUEST` (1007, Android Back). **There is no `WM_CLOSE_REQUEST` on mobile.** Autosave on PAUSED; **iOS gives ~5 s** after pause to finish work before it kills the app.

### GDScript

```gdscript
func _notification(what: int) -> void:
    match what:
        NOTIFICATION_APPLICATION_PAUSED:
            SaveManager.save_game() # App backgrounded — persist now.
        NOTIFICATION_WM_GO_BACK_REQUEST:
            _confirm_quit()         # Android Back button.
```

### C# Equivalent

The docs only show `NotificationWMCloseRequest` verbatim; these PascalCase names follow the same convention.

```csharp
public override void _Notification(int what)
{
    switch ((long)what)
    {
        case NotificationApplicationPaused:
            SaveManager.SaveGame(); // App backgrounded — persist now.
            break;
        case NotificationWMGoBackRequest:
            ConfirmQuit();          // Android Back button.
            break;
    }
}
```

---

## 3. Permissions

Declare each permission in the export preset as `permissions/<name>`; request it at runtime with `OS.request_permission(name)`. The result arrives via `MainLoop`'s `on_request_permissions_result(permission, granted)`. The permission **must also be enabled in the preset**, not just requested.

### GDScript

```gdscript
func _ready():
    if "android.permission.POST_NOTIFICATIONS" not in OS.get_granted_permissions():
        OS.request_permission("android.permission.POST_NOTIFICATIONS")
    get_tree().on_request_permissions_result.connect(_on_perm_result)

func _on_perm_result(permission: String, granted: bool):
    print("%s granted: %s" % [permission, granted])
```

### C# Equivalent

```csharp
public override void _Ready()
{
    if (!OS.GetGrantedPermissions().Contains("android.permission.POST_NOTIFICATIONS"))
        OS.RequestPermission("android.permission.POST_NOTIFICATIONS");
    GetTree().OnRequestPermissionsResult += OnPermResult;
}

private void OnPermResult(string permission, bool granted)
    => GD.Print($"{permission} granted: {granted}");
```

---

## 4. Calling Android APIs (JavaClassWrapper) — Godot 4.4+

**Godot 4.4+ only.** `JavaClassWrapper.wrap("<java.class>")` calls Java/Kotlin classes with no plugin; the `AndroidRuntime` singleton (`Engine.get_singleton("AndroidRuntime")`) exposes `getActivity()`, `getApplicationContext()`, and `createRunnableFromGodotCallable(callable)`.

The simpler cross-platform alternative needs no 4.4: `Input.vibrate_handheld(duration_ms, amplitude)` (requires the `VIBRATE` permission; iOS needs iOS 13+). See [Plugins](references/plugins.md) for the full JavaClassWrapper/AndroidRuntime API, Toast/Intent recipes, and inner-class syntax.

### GDScript

```gdscript
# Godot 4.4+ — requires the VIBRATE permission in the export preset.
func vibrate_ms(duration_ms: int) -> void:
    if Engine.has_singleton("AndroidRuntime"):
        var runtime := Engine.get_singleton("AndroidRuntime")
        var context := runtime.getApplicationContext()
        var vibrator := context.getSystemService("vibrator")
        if vibrator.hasVibrator():
            var Effect = JavaClassWrapper.wrap("android.os.VibrationEffect")
            var effect = Effect.createOneShot(duration_ms, Effect.DEFAULT_AMPLITUDE)
            vibrator.vibrate(effect)
```

### C# Equivalent

The docs are GDScript-only here; the exact C# Variant-marshaling chain (`.AsGodotObject()` on each Java return) is untested against a device — verify on a real 4.4+ Android build.

```csharp
// Godot 4.4+ — requires the VIBRATE permission in the export preset.
public void VibrateMs(int durationMs)
{
    if (!Engine.HasSingleton("AndroidRuntime")) return;
    var runtime = Engine.GetSingleton("AndroidRuntime");
    var context = runtime.Call("getApplicationContext").AsGodotObject();
    var vibrator = context.Call("getSystemService", "vibrator").AsGodotObject();
    if (vibrator.Call("hasVibrator").AsBool())
    {
        var effect = JavaClassWrapper.Wrap("android.os.VibrationEffect");
        var oneShot = effect.Call("createOneShot", durationMs, effect.Get("DEFAULT_AMPLITUDE"));
        vibrator.Call("vibrate", oneShot);
    }
}
```

---

## 5. Device features & safe area

`DisplayServer.get_display_safe_area() -> Rect2i` (Android/iOS) returns the usable region inside notches/cutouts; `get_display_cutouts()` (Android) lists the cutout rects. Motion sensors live on `Input` (`get_accelerometer/gravity/gyroscope/magnetometer`, returning `Vector3`, Android/iOS only).

### GDScript

```gdscript
func _ready():
    var safe := DisplayServer.get_display_safe_area() # Rect2i
    $UI.position = safe.position
    $UI.size = safe.size
```

### C# Equivalent

```csharp
public override void _Ready()
{
    Rect2I safe = DisplayServer.GetDisplaySafeArea();
    var ui = GetNode<Control>("UI");
    ui.Position = safe.Position;
    ui.Size = safe.Size;
}
```

---

## 6. Mobile performance & renderer

Use the **Mobile** (or **Compatibility**) renderer; the iOS simulator is Compatibility-only. Enable `rendering/textures/vram_compression/import_etc2_astc = true` (ETC2/ASTC) for Android texture compression. Keep single-arch APKs small; AABs split per-device automatically. Defer deep draw-call/batching tuning to **godot-optimization**.

---

## 7. C# on mobile

C# Android/iOS export is **Godot 4.2+ but experimental**. **Android C# export requires .NET 9+** (with Godot 4.5); iOS export only from macOS, and the simulator templates are x64-only. **C# cannot export to Web.** Test the C# export pipeline early — it is the riskiest part of a C# mobile project.

> **Deeper:** [Plugins (Android v2 / iOS)](references/plugins.md) · [In-app purchases & ads](references/iap-and-ads.md) · [Crash debugging](references/crash-debugging.md)

---

## Implementation Checklist

- [ ] Release keystore (Android) / provisioning + Team ID (iOS) configured
- [ ] AAB for Play uploads; Gradle build installed if using v2 plugins or IAP
- [ ] Autosave wired to `NOTIFICATION_APPLICATION_PAUSED` (iOS ~5 s budget respected)
- [ ] Required permissions enabled in the preset AND requested at runtime
- [ ] JavaClassWrapper usage labeled Godot 4.4+; fallbacks for 4.3 if needed
- [ ] UI anchored inside `get_display_safe_area()`; notch/cutout handled
- [ ] Mobile/Compatibility renderer + ETC2/ASTC compression enabled
- [ ] C# projects: verified .NET 9+ for Android export
