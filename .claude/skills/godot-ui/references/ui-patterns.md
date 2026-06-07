# Common UI Patterns

Reference for `skills/godot-ui/SKILL.md` — main menu scene, settings screen with tabs, pause menu overlay. Full GDScript implementations.

> ← Back to [SKILL.md](../SKILL.md)

---
## 6. Common UI Patterns

### Main Menu Scene Tree

```
MainMenu (Control — LayoutPreset: Full Rect)
└── Background (TextureRect — stretch: EXPAND_FIT, anchor: Full Rect)
└── CenterContainer (anchor: Full Rect)
    └── VBoxContainer
        ├── TitleLabel (Label)
        ├── StartButton (Button)
        ├── OptionsButton (Button)
        └── QuitButton (Button)
```

**GDScript:**

```gdscript
# scenes/screens/main_menu.gd
extends Control

func _ready() -> void:
    $CenterContainer/VBoxContainer/StartButton.grab_focus()

func _on_start_button_pressed() -> void:
    GameManager.change_scene("res://scenes/levels/level_01.tscn")

func _on_options_button_pressed() -> void:
    # Replace with your options screen path or overlay
    GameManager.change_scene("res://scenes/screens/options.tscn")

func _on_quit_button_pressed() -> void:
    get_tree().quit()
```

**C#:**

```csharp
// scenes/screens/MainMenu.cs
using Godot;

public partial class MainMenu : Control
{
    public override void _Ready()
    {
        GetNode<Button>("CenterContainer/VBoxContainer/StartButton").GrabFocus();
    }

    private void OnStartButtonPressed() =>
        GameManager.Instance.ChangeScene("res://scenes/levels/level_01.tscn");

    private void OnOptionsButtonPressed() =>
        GameManager.Instance.ChangeScene("res://scenes/screens/options.tscn");

    private void OnQuitButtonPressed() =>
        GetTree().Quit();
}
```

---

### Settings Screen with Tabs

```
OptionsScreen (Control — anchor: Full Rect)
└── PanelContainer (anchor: Full Rect)
    └── VBoxContainer
        ├── TitleLabel (Label — text: "Settings")
        ├── TabContainer
        │   ├── AudioTab (VBoxContainer — name: "Audio")
        │   │   ├── HBoxContainer
        │   │   │   ├── Label (text: "Master Volume")
        │   │   │   └── MasterSlider (HSlider)
        │   │   ├── HBoxContainer
        │   │   │   ├── Label (text: "Music Volume")
        │   │   │   └── MusicSlider (HSlider)
        │   │   └── HBoxContainer
        │   │       ├── Label (text: "SFX Volume")
        │   │       └── SFXSlider (HSlider)
        │   └── VideoTab (VBoxContainer — name: "Video")
        │       ├── HBoxContainer
        │       │   ├── Label (text: "Fullscreen")
        │       │   └── FullscreenCheck (CheckButton)
        │       └── HBoxContainer
        │           ├── Label (text: "Resolution")
        │           └── ResolutionOptions (OptionButton)
        └── CloseButton (Button — text: "Close")
```

**GDScript:**

```gdscript
# scenes/screens/options_screen.gd
extends Control

func _ready() -> void:
    var master_bus := AudioServer.get_bus_index("Master")
    $PanelContainer/VBoxContainer/TabContainer/AudioTab/HBoxContainer/MasterSlider.value = \
        db_to_linear(AudioServer.get_bus_volume_db(master_bus))

func _on_master_slider_value_changed(value: float) -> void:
    AudioServer.set_bus_volume_db(
        AudioServer.get_bus_index("Master"),
        linear_to_db(value)
    )

func _on_fullscreen_check_toggled(button_pressed: bool) -> void:
    DisplayServer.window_set_mode(
        DisplayServer.WINDOW_MODE_FULLSCREEN if button_pressed
        else DisplayServer.WINDOW_MODE_WINDOWED
    )

func _on_close_button_pressed() -> void:
    queue_free()   # or hide() if you want to keep state
```

**C#:**

```csharp
// scenes/screens/OptionsScreen.cs
using Godot;

public partial class OptionsScreen : Control
{
    public override void _Ready()
    {
        int masterBus = AudioServer.GetBusIndex("Master");
        var slider = GetNode<HSlider>(
            "PanelContainer/VBoxContainer/TabContainer/AudioTab/HBoxContainer/MasterSlider");
        slider.Value = Mathf.DbToLinear(AudioServer.GetBusVolumeDb(masterBus));
    }

    private void OnMasterSliderValueChanged(float value)
    {
        AudioServer.SetBusVolumeDb(
            AudioServer.GetBusIndex("Master"),
            Mathf.LinearToDb(value));
    }

    private void OnFullscreenCheckToggled(bool buttonPressed)
    {
        DisplayServer.WindowSetMode(buttonPressed
            ? DisplayServer.WindowMode.Fullscreen
            : DisplayServer.WindowMode.Windowed);
    }

    private void OnCloseButtonPressed() => QueueFree();
}
```

---

### Pause Menu Overlay

The pause menu lives in its own scene that is added to the tree at runtime. Set the root `Control`'s `process_mode` to `PROCESS_MODE_ALWAYS` so it continues running while the tree is paused.

```
PauseMenu (Control — anchor: Full Rect, process_mode: Always)
└── ColorRect (anchor: Full Rect, color: Color(0,0,0,0.6))
└── CenterContainer (anchor: Full Rect)
    └── PanelContainer
        └── VBoxContainer
            ├── Label (text: "Paused")
            ├── ResumeButton (Button)
            ├── OptionsButton (Button)
            └── QuitToMenuButton (Button)
```

**GDScript:**

```gdscript
# scenes/ui/pause_menu.gd
extends Control

func _ready() -> void:
    # Ensure this node and all children keep processing while paused
    process_mode = Node.PROCESS_MODE_ALWAYS
    $CenterContainer/PanelContainer/VBoxContainer/ResumeButton.grab_focus()

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel"):
        _on_resume_button_pressed()

func _on_resume_button_pressed() -> void:
    get_tree().paused = false
    queue_free()

func _on_options_button_pressed() -> void:
    var options := preload("res://scenes/screens/options_screen.tscn").instantiate()
    add_child(options)

func _on_quit_to_menu_button_pressed() -> void:
    get_tree().paused = false
    GameManager.change_scene("res://scenes/screens/main_menu.tscn")
```

**C#:**

```csharp
// scenes/ui/PauseMenu.cs
using Godot;

public partial class PauseMenu : Control
{
    public override void _Ready()
    {
        ProcessMode = ProcessModeEnum.Always;
        GetNode<Button>(
            "CenterContainer/PanelContainer/VBoxContainer/ResumeButton").GrabFocus();
    }

    public override void _UnhandledInput(InputEvent @event)
    {
        if (@event.IsActionPressed("ui_cancel"))
            OnResumeButtonPressed();
    }

    private void OnResumeButtonPressed()
    {
        GetTree().Paused = false;
        QueueFree();
    }

    private void OnOptionsButtonPressed()
    {
        var options = GD.Load<PackedScene>("res://scenes/screens/options_screen.tscn").Instantiate();
        AddChild(options);
    }

    private void OnQuitToMenuButtonPressed()
    {
        GetTree().Paused = false;
        GameManager.Instance.ChangeScene("res://scenes/screens/main_menu.tscn");
    }
}
```

**Toggling the pause menu from game code (GDScript):**

```gdscript
# In your GameManager or a player HUD script
var _pause_menu_scene := preload("res://scenes/ui/pause_menu.tscn")
var _pause_menu: Control = null

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_just_pressed("ui_cancel"):
        if get_tree().paused:
            return  # PauseMenu handles its own resume
        _pause_menu = _pause_menu_scene.instantiate()
        get_tree().root.add_child(_pause_menu)
        get_tree().paused = true
```

---

