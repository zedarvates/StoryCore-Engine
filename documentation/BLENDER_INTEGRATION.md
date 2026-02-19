# Intégration Blender — StoryCore-Engine

> Système de mise en scène 3D automatisée pour la génération d'images de référence IA vidéo.  
> Blender est utilisé comme moteur 3D principal, exécuté en mode **headless** via scripts Python générés dynamiquement.

---

## 1. Architecture

```
storycore-engine/
├── blender_bridge/              # Pipeline vocal → JSON → Blender
│   ├── __init__.py
│   ├── voice_bridge.py          # Parsing commandes vocales
│   ├── camera_system.py         # Gestion caméras cinématographiques
│   ├── headless_runner.py       # Exécution Blender CLI
│   ├── backend_integration.py   # Intégration backend StoryCore
│   └── cli.py                   # Interface ligne de commande
│
├── blender_projection/          # Moteur de projection 2.5D
│   ├── __init__.py
│   ├── scene_builder.py         # Orchestrateur principal
│   ├── asset_library.py         # Catalogue 26 assets (mesh 3D + sprites)
│   ├── asset_placer.py          # Plantation procédurale d'assets
│   └── reference_renderer.py   # Génération images référence IA vidéo
│
└── exports/blender/             # Sorties générées
    ├── references/              # Scripts .py Blender + renders PNG
    └── *.py                     # Scripts de placement auto
```

---

## 2. Pipeline complet

```
Commande vocale
    │
    ▼
VoiceBridge (parsing sémantique)
    │  "Crée une ruelle cyberpunk sous pluie, caméra basse 35mm"
    ▼
JSON structuré {scene, camera, characters, atmosphere}
    │
    ▼
ReferenceRenderer / SceneBuilder
    │  generate_from_preset(image_path, preset_name, camera_shot)
    ▼
Script Python Blender (.py)
    │  skybox + assets procéduraux + caméra + éclairage 3 points
    ▼
Blender headless (EEVEE)
    │  blender -b -P ref_script.py
    ▼
PNG 1920×1080 (image de référence propre)
    │
    ▼
IA Vidéo (Kling / Runway / SVD / CogVideoX...)
    │  image de référence + prompt textuel
    ▼
Vidéo finale stylisée
```

---

## 3. Modules blender_projection/

### 3.1 AssetLibrary — Catalogue d'assets

26 assets classés en 5 catégories :

| Catégorie | Assets |
|-----------|--------|
| **TREES** | tree_conifer, tree_deciduous, tree_palm, tree_dead, tree_willow |
| **ROCKS** | rock_medium, rock_boulder, rock_cluster |
| **PLANTS** | plant_bush, plant_fern, plant_tall_grass, plant_cactus, plant_mushroom |
| **SPRITES** | sprite_tree_forest, rock_cliff_face, sprite_grass_ground, sprite_foliage_distant, sprite_cloud |
| **PROPS** | prop_streetlamp, prop_crate, prop_barrel, prop_debris |
| **FOLIAGE** | foliage_ivy, foliage_moss |
| **ATMOSPHERE** | atm_fog_volume, atm_rain_particles |

```python
from blender_projection import AssetLibrary, AssetCategory, SceneContext

lib = AssetLibrary()
# Suggestion automatique par tags narratifs
suggestions = lib.suggest_for_scene(
    tags=["foret", "brume", "nature"],
    context=SceneContext.EXTERIOR,
)
```

### 3.2 AssetPlacer — Plantation procédurale

```python
from blender_projection import AssetPlacer

placer = AssetPlacer()

# Code Blender pour 1 type d'asset
code = placer.generate_placement_code(
    asset_id="tree_conifer",
    count=6,
    area_bounds=(-8.0, 8.0, 0.0, 14.0),
    seed=42,
)

# Script complet multi-assets
script_path = placer.generate_full_script([
    {"asset_id": "tree_conifer",        "count": 6, "seed": 1},
    {"asset_id": "rock_medium",         "count": 4, "seed": 2},
    {"asset_id": "sprite_grass_ground", "count": 15, "seed": 3},
], output_path="./exports/blender/foret.py")

# Auto-suggestion depuis tags narratifs
auto = placer.suggest_and_place(
    narrative_tags=["desert", "aride", "cactus"],
    density="medium",  # light | medium | heavy
    output_path="./exports/blender/desert.py",
)
```

**Assets 3D Mesh** : géométrie Blender procédurale (cylinders, ico-spheres, cones)  
**Sprites 2D Billboard** : plans orientés caméra (Track To constraint), avec alpha clip

### 3.3 ReferenceRenderer — Images de référence IA vidéo

```python
from blender_projection import ReferenceRenderer

r = ReferenceRenderer(output_dir="./exports/blender/references")

# Depuis un preset
script = r.generate_from_preset(
    image_path="./assets/generated/scene_cyberpunk.png",
    preset_name="urbain",      # foret|desert|urbain|montagne|tropical|interieur
    camera_shot="low_angle",   # wide|close|low_angle|high_angle|over_shoulder
    camera_lens=35.0,
    density="heavy",           # light|medium|heavy
)

# Depuis tags narratifs (auto)
script = r.generate_reference_script(
    image_path="./assets/generated/scene.png",
    scene_type="exterior",
    narrative_tags=["foret", "brume", "fantastique"],
    camera_shot="wide",
    camera_lens=24.0,
    use_depth_map=True,
    depth_map_path="./assets/generated/scene_depth.png",
    engine="EEVEE",  # EEVEE (rapide) | CYCLES (qualité)
)

# Exécution headless
# blender -b -P {script}
```

**Presets disponibles :**

| Preset | Contexte | Assets inclus |
|--------|----------|---------------|
| `foret` | exterior | conifères, feuillus, fougères, rochers, herbe |
| `desert` | exterior | cactus, rochers, éboulis |
| `urbain` | exterior | lampadaires, caisses, barils, débris |
| `montagne` | exterior | rochers, bouldres, conifères morts |
| `tropical` | exterior | palmiers, buissons, herbe |
| `interieur` | interior | projection sur 4 murs + sol + plafond |

---

## 4. Caméras cinématographiques

| Mode | Position | Focale | f-stop | Effet |
|------|----------|--------|--------|-------|
| `wide` | (0, -8, 1.7) | 24mm | 5.6 | Plan large |
| `close` | (0, -1.5, 1.65) | 85mm | 1.8 | Plan serré, bokeh |
| `low_angle` | (0, -4, 0.4) | 28mm | 4.0 | Contre-plongée |
| `high_angle` | (0, -3, 5.0) | 35mm | 4.0 | Plongée |
| `over_shoulder` | (0.4, -1.8, 1.7) | 50mm | 2.8 | Par-dessus épaule |

---

## 5. Commandes vocales supportées

Le `VoiceBridge` dans `blender_bridge/` parse ces commandes :

```
"Crée une ruelle cyberpunk sous pluie"
→ preset: urbain + atmosphere: rain

"Caméra basse 35mm légère contre-plongée"
→ camera_shot: low_angle, lens: 35mm

"Ajoute brouillard volumétrique"
→ atmosphere: fog_volume

"Place personnage Alpha à 2 mètres devant caméra"
→ character: {name: Alpha, position: [0, 2, 0]}

"Plan serré sur visage"
→ camera_shot: close, lens: 85mm
```

**JSON de scène généré :**
```json
{
  "scene": "ruelle_cyberpunk",
  "scene_type": "exterior",
  "camera": {
    "shot": "low_angle",
    "position": [0, -4, 0.4],
    "rotation": [1.22, 0, 0],
    "lens": 35,
    "dof_fstop": 4.0,
    "dof_distance": 4.0
  },
  "assets": {
    "prop_streetlamp": 3,
    "prop_debris": 5,
    "prop_crate": 4,
    "prop_barrel": 2
  },
  "atmosphere": {
    "fog": true,
    "rain": true
  },
  "characters": [
    {
      "name": "Alpha",
      "type": "humanoid_rig_placeholder",
      "position": [0, 0, 0]
    }
  ],
  "render": {
    "engine": "EEVEE",
    "resolution": [1920, 1080]
  }
}
```

---

## 6. Exécution Blender headless

### Commande de base
```bash
blender -b -P ref_script.py
```

### Avec arguments (scene_builder CLI)
```bash
blender -b -P generate_scene.py -- image.png exterior
blender -b -P generate_scene.py -- image.png interior low_angle 50
```

### Via HeadlessRunner Python
```python
from blender_bridge.headless_runner import HeadlessRunner

runner = HeadlessRunner(blender_path="blender")
result = runner.run(script_path="./exports/blender/ref_foret.py")
print(result.render_path)  # chemin du PNG rendu
```

---

## 7. Environnement Blender

### Extérieur (skybox)
- Cube 30m avec normales inversées (faces vers l'intérieur)
- Image IA projetée en Emission shader (pas de shadow)
- Projection UV Object space
- Sol plane 30m (ground material roughness 0.9)

### Intérieur (pièce)
- 4 murs + sol + plafond (cubes scaled)
- Image IA projetée via ShaderNodeTexImage sur chaque mur
- Subdivision légère + normal map optionnelle

### Éclairage 3 points (tous modes)
| Lumière | Type | Energie | Couleur |
|---------|------|---------|---------|
| Sun (key) | SUN | 3.0W | blanc |
| Fill | AREA | 50W | bleu froid (0.6, 0.7, 1.0) |
| Rim | AREA | 30W | chaud (1.0, 0.9, 0.7) |

---

## 8. Séparation narrative / technique

```
Niveau 1 — Narratif (commande vocale, tags)
    "ruelle cyberpunk sous pluie, plan serré"
         │
         ▼
Niveau 2 — Technique JSON (SceneJSON)
    {scene: urbain, camera: close 35mm, atmosphere: rain}
         │
         ▼
Niveau 3 — Script Blender Python (généré)
    bpy.ops.mesh.primitive_cube_add(...)
    cam.lens = 35
    scene.render.engine = "BLENDER_EEVEE"
         │
         ▼
Niveau 4 — Exécution (headless)
    blender -b -P script.py
         │
         ▼
Niveau 5 — PNG référence → IA vidéo
```

---

## 9. Points d'intégration avec le système vocal existant

```python
# Dans backend/voice_commands.py (point d'intégration)
from blender_bridge.voice_bridge import VoiceBridge
from blender_projection import ReferenceRenderer

bridge = VoiceBridge()
renderer = ReferenceRenderer()

def on_voice_command(text: str, generated_image_path: str):
    # 1. Parser la commande
    scene_json = bridge.parse(text)
    
    # 2. Générer le script Blender
    script = renderer.generate_reference_script(
        image_path=generated_image_path,
        scene_type=scene_json["scene_type"],
        narrative_tags=scene_json["tags"],
        camera_shot=scene_json["camera"]["shot"],
        camera_lens=scene_json["camera"]["lens"],
        assets=scene_json.get("assets"),
    )
    
    # 3. Exécuter Blender headless
    from blender_bridge.headless_runner import HeadlessRunner
    result = HeadlessRunner().run(script)
    
    return result.render_path  # PNG prêt pour IA vidéo
```

---

## 10. Contraintes et bonnes pratiques

- Blender exécuté **uniquement en headless** (`-b`)
- **Jamais** de hardcode de chemins (tout via paramètres JSON)
- Séparation claire : description narrative ≠ description technique ≠ exécution
- Les scripts Python générés sont reproductibles (seed fixe)
- Ne pas modifier les assets originaux (linked duplicates)
- Grammaire vocale figée → stabilité du parser
- EEVEE pour vitesse (preview), CYCLES pour qualité (production)
