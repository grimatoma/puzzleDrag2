# Materials & Lighting Recipes

Reference for `skills/3d-essentials/SKILL.md` — runnable code recipes for creating materials at runtime, per-instance material copies, and dynamic lights with tween-driven decay.

> ← Back to [SKILL.md](../SKILL.md)

---

## Setting Materials from Code

### GDScript

```gdscript
@onready var mesh: MeshInstance3D = $MeshInstance3D

func _ready() -> void:
    var mat := StandardMaterial3D.new()
    mat.albedo_color = Color(0.8, 0.2, 0.2)
    mat.metallic = 0.3
    mat.roughness = 0.7
    mesh.material_override = mat

func flash_emissive() -> void:
    var mat: StandardMaterial3D = mesh.material_override
    mat.emission_enabled = true
    mat.emission = Color.WHITE
    mat.emission_energy_multiplier = 3.0
    var tween := create_tween()
    tween.tween_property(mat, "emission_energy_multiplier", 0.0, 0.3)
    tween.tween_callback(func(): mat.emission_enabled = false)
```

### C#

```csharp
private MeshInstance3D _mesh;

public override void _Ready()
{
    _mesh = GetNode<MeshInstance3D>("MeshInstance3D");
    var mat = new StandardMaterial3D();
    mat.AlbedoColor = new Color(0.8f, 0.2f, 0.2f);
    mat.Metallic = 0.3f;
    mat.Roughness = 0.7f;
    _mesh.MaterialOverride = mat;
}

public void FlashEmissive()
{
    var mat = _mesh.MaterialOverride as StandardMaterial3D;
    mat.EmissionEnabled = true;
    mat.Emission = Colors.White;
    mat.EmissionEnergyMultiplier = 3.0f;
    var tween = CreateTween();
    tween.TweenProperty(mat, "emission_energy_multiplier", 0.0f, 0.3);
    tween.TweenCallback(Callable.From(() => mat.EmissionEnabled = false));
}
```

## Material Instancing

When multiple `MeshInstance3D` nodes share the same material, changing one affects all. To make a per-instance copy:

```gdscript
# In _ready() — creates an independent copy of the material
mesh.material_override = mesh.material_override.duplicate()
```

```csharp
_mesh.MaterialOverride = (Material)_mesh.MaterialOverride.Duplicate();
```

## Dynamic Point Light

Spawn an OmniLight3D at runtime, drive its energy with a tween, and queue-free it on tween completion. Pattern works for explosions, muzzle flashes, magic effects.

```gdscript
func create_explosion_light(pos: Vector3) -> void:
    var light := OmniLight3D.new()
    light.light_color = Color(1.0, 0.6, 0.2)
    light.light_energy = 4.0
    light.omni_range = 10.0
    light.omni_attenuation = 2.0
    light.position = pos
    add_child(light)

    var tween := create_tween()
    tween.tween_property(light, "light_energy", 0.0, 0.5)
    tween.tween_callback(light.queue_free)
```

```csharp
public void CreateExplosionLight(Vector3 pos)
{
    var light = new OmniLight3D();
    light.LightColor = new Color(1.0f, 0.6f, 0.2f);
    light.LightEnergy = 4.0f;
    light.OmniRange = 10.0f;
    light.OmniAttenuation = 2.0f;
    light.Position = pos;
    AddChild(light);

    var tween = CreateTween();
    tween.TweenProperty(light, "light_energy", 0.0f, 0.5);
    tween.TweenCallback(Callable.From(light.QueueFree));
}
```

## Bent Normal Maps (Godot 4.5+)

Code path for setting a bent-normal texture at runtime (the typical case is via Inspector instead).

```gdscript
@onready var mesh: MeshInstance3D = $MeshInstance3D

func _ready() -> void:
    var mat := mesh.get_surface_override_material(0) as StandardMaterial3D
    if mat == null:
        mat = StandardMaterial3D.new()
    mat.bent_normal_enabled = true
    mat.bent_normal_texture = preload("res://textures/rock_bent_normal.png")
    mesh.set_surface_override_material(0, mat)
```

```csharp
private MeshInstance3D _mesh;

public override void _Ready()
{
    _mesh = GetNode<MeshInstance3D>("MeshInstance3D");
    var mat = _mesh.GetSurfaceOverrideMaterial(0) as StandardMaterial3D
        ?? new StandardMaterial3D();
    mat.BentNormalEnabled = true;
    mat.BentNormalTexture = GD.Load<Texture2D>("res://textures/rock_bent_normal.png");
    _mesh.SetSurfaceOverrideMaterial(0, mat);
}
```
