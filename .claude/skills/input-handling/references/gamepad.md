# Controller / Gamepad

Reference for `skills/input-handling/SKILL.md` — detecting controllers, gamepad-via-Input-Map, analog stick with deadzone, vibration, detecting input device for UI prompts.

> ← Back to [SKILL.md](../SKILL.md)

---
## 5. Controller / Gamepad Support

### Detecting Controllers

```gdscript
func _ready() -> void:
    Input.joy_connection_changed.connect(_on_joy_connection_changed)

func _on_joy_connection_changed(device: int, connected: bool) -> void:
    if connected:
        var name := Input.get_joy_name(device)
        print("Controller connected: %s (device %d)" % [name, device])
    else:
        print("Controller disconnected: device %d" % device)
```

```csharp
public override void _Ready()
{
    Input.JoyConnectionChanged += OnJoyConnectionChanged;
}

private void OnJoyConnectionChanged(long device, bool connected)
{
    if (connected)
        GD.Print($"Controller connected: {Input.GetJoyName((int)device)} (device {device})");
    else
        GD.Print($"Controller disconnected: device {device}");
}
```

### Gamepad Input via Input Map

The best approach: add gamepad events alongside keyboard events to the same Input Map actions. Both inputs trigger the same action — no code changes needed.

In **Project > Project Settings > Input Map**, add to your `move_left` action:
- Key: A
- Joypad Axis: Left Stick Left (Axis 0, negative)

Then `Input.get_vector()` works for both keyboard and gamepad automatically.

### Analog Stick with Deadzone

```gdscript
# Input Map handles deadzones per-action (set in Project Settings)
# For manual deadzone control:
func get_stick_input(deadzone: float = 0.2) -> Vector2:
    var raw := Vector2(
        Input.get_joy_axis(0, JOY_AXIS_LEFT_X),
        Input.get_joy_axis(0, JOY_AXIS_LEFT_Y)
    )
    # Radial deadzone (better than per-axis)
    if raw.length() < deadzone:
        return Vector2.ZERO
    return raw.normalized() * inverse_lerp(deadzone, 1.0, raw.length())
```

```csharp
public Vector2 GetStickInput(float deadzone = 0.2f)
{
    var raw = new Vector2(
        Input.GetJoyAxis(0, JoyAxis.LeftX),
        Input.GetJoyAxis(0, JoyAxis.LeftY)
    );
    if (raw.Length() < deadzone)
        return Vector2.Zero;
    return raw.Normalized() * Mathf.InverseLerp(deadzone, 1.0f, raw.Length());
}
```

> **Prefer Input Map deadzones** over manual deadzone code. The Input Map deadzone is set per-action and works automatically with `Input.get_vector()` / `Input.get_axis()`.

### Gamepad Vibration

```gdscript
# weak motor = low frequency rumble, strong motor = high frequency rumble
# Duration in seconds; 0 = until stopped
Input.start_joy_vibration(0, 0.5, 0.3, 0.2)  # device 0, weak 0.5, strong 0.3, 0.2s

# Stop vibration
Input.stop_joy_vibration(0)
```

```csharp
Input.StartJoyVibration(0, 0.5f, 0.3f, 0.2f);
Input.StopJoyVibration(0);
```

### Detecting Input Device for UI Prompts

Switch between keyboard and gamepad icons based on what the player last used.

```gdscript
# input_icon_manager.gd — autoload
extends Node

signal input_device_changed(is_gamepad: bool)

var is_using_gamepad: bool = false

func _input(event: InputEvent) -> void:
    var was_gamepad := is_using_gamepad

    if event is InputEventJoypadButton or event is InputEventJoypadMotion:
        is_using_gamepad = true
    elif event is InputEventKey or event is InputEventMouseButton or event is InputEventMouseMotion:
        is_using_gamepad = false

    if was_gamepad != is_using_gamepad:
        input_device_changed.emit(is_using_gamepad)
```

```csharp
using Godot;

public partial class InputIconManager : Node
{
    [Signal]
    public delegate void InputDeviceChangedEventHandler(bool isGamepad);

    public bool IsUsingGamepad { get; private set; }

    public override void _Input(InputEvent @event)
    {
        bool wasGamepad = IsUsingGamepad;

        if (@event is InputEventJoypadButton or InputEventJoypadMotion)
            IsUsingGamepad = true;
        else if (@event is InputEventKey or InputEventMouseButton or InputEventMouseMotion)
            IsUsingGamepad = false;

        if (wasGamepad != IsUsingGamepad)
            EmitSignal(SignalName.InputDeviceChanged, IsUsingGamepad);
    }
}
```

---

