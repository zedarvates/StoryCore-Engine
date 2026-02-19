# BlenderBridge — StoryCore-Engine

Module d'intégration Blender pour la génération automatisée de scènes 3D et 2.5D depuis des commandes vocales.

---

## Architecture

```
Commande vocale (FR/EN)
        ↓
  VoiceToSceneBridge          ← grammaire déterministe, stable
        ↓
    SceneJSON                 ← contrat de données (séparation narrative / technique)
        ↓
BlenderScriptGenerator        ← génère un .py autonome et lisible
        ↓
BlenderHeadlessRunner         ← blender -b -P script.py
        ↓
    render.png                ← sortie finale
```

**Principe fondamental :** séparer interprétation artistique et exécution technique.

---

## Installation rapide

### 1. Configurer le chemin Blender

Éditer `config/blender_config.json` :

```json
{
    "executable": "C:/Program Files/Blender Foundation/Blender 4.2/blender.exe"
}
```

Ou via variable d'environnement (`.env`) :
```
BLENDER_EXECUTABLE=C:/Program Files/Blender Foundation/Blender 4.2/blender.exe
```

**Priorité de résolution :**
1. `BLENDER_EXECUTABLE` (env var) — override absolu
2. `config/blender_config.json` → `"executable"` — recommandé
3. Auto-détection PATH + chemins communs Windows/Linux/Mac

### 2. Vérifier le statut

```bash
python -m blender_bridge.cli status
```

---

## Utilisation — CLI

```bash
# Statut du système
python -m blender_bridge.cli status

# Parser une commande vocale → voir la scène
python -m blender_bridge.cli scene "Ruelle cyberpunk sous pluie avec Alpha"
python -m blender_bridge.cli scene "Ruelle cyberpunk" --json

# Générer uniquement le script Blender (sans exécuter)
python -m blender_bridge.cli script "Forêt brumeuse au lever du soleil"

# Dry-run : voir la commande CLI qui serait lancée
python -m blender_bridge.cli dry-run "Caméra basse 35mm légère contre-plongée"

# Rendu complet
python -m blender_bridge.cli render "Ruelle cyberpunk sous pluie avec Alpha"

# Construction incrémentale
python -m blender_bridge.cli project \
    "Ruelle cyberpunk" \
    "Caméra basse 35mm" \
    "Alpha a 2 metres devant" \
    "Ajoute brouillard volumetrique dense"

# Scène 2.5D depuis image
python -m blender_bridge.cli project2d scene.png exterior --camera low_angle --trees 5

# Storyboard depuis fichier beats
python -m blender_bridge.cli storyboard beats.json --output ./renders/

# Lister presets et types de plans
python -m blender_bridge.cli presets
python -m blender_bridge.cli shots
```

---

## Utilisation — Python API

```python
from blender_bridge import BlenderBridge

bridge = BlenderBridge()

# ── Pipeline complet ──────────────────────────────────────────────
result = bridge.render_from_voice("Ruelle cyberpunk sous pluie avec Alpha")
print(result["render_path"])   # ./exports/blender/renders/...
print(result["success"])        # True / False

# ── Étape par étape ───────────────────────────────────────────────
scene = bridge.parse_voice_command("Ruelle cyberpunk nocturne")
scene = bridge.modify_scene(scene, "Caméra basse 35mm")
scene = bridge.modify_scene(scene, "Alpha a 2 metres devant")
result = bridge.render(scene)

# ── Dry-run (sans Blender) ────────────────────────────────────────
dry = bridge.dry_run("Caméra basse 35mm contre-plongée")
print(dry["command"])   # blender --background --python ...
print(dry["scene_json"])  # dict SceneJSON

# ── Générer uniquement le script ─────────────────────────────────
script_path = bridge.generate_script_only("Forêt brumeuse")
```

---

## Commandes vocales supportées

| Exemple de commande | Effet |
|---|---|
| `"Crée une ruelle cyberpunk sous pluie"` | Scène cyberpunk + preset lieu + pluie |
| `"Caméra basse 35mm légère contre-plongée"` | `LOW_ANGLE_CLOSE` + 35mm + f/2.0 |
| `"Plan serré sur visage"` | `CLOSE_UP` + 85mm |
| `"Plan large grand angle"` | `WIDE` + 24mm |
| `"Over shoulder dialogue"` | `OVER_SHOULDER` + 50mm |
| `"Ajoute brouillard volumétrique dense"` | `AtmosphereType.VOLUMETRIC` × 1.5 |
| `"Place Alpha à 2 mètres devant caméra"` | `CharacterRig("Alpha")` à 2m |
| `"Forêt brumeuse au lever du jour"` | Preset `foret_brumeuse` auto-détecté |
| `"Fond désert aride soleil rasant"` | Preset `desert` auto-détecté |

### JSON généré automatiquement

```json
{
  "scene": "ruelle_cyberpunk",
  "camera": {
    "position": [0.0, -4.0, 0.4],
    "rotation": [70.0, 0.0, 0.0],
    "lens": 35,
    "shot_type": "low_angle_close",
    "dof_enabled": true,
    "f_stop": 2.0
  },
  "atmosphere": {"type": "rain", "density": 0.03},
  "characters": [
    {"name": "Alpha", "position": [0.0, -2.0, 0.0], "type": "humanoid"}
  ]
}
```

---

## Types de plans disponibles

| Code | Description | Focale par défaut |
|---|---|---|
| `wide` | Plan large — espace complet | 24mm |
| `medium` | Plan moyen — standard | 50mm |
| `close_up` | Gros plan — émotion, détail | 85mm |
| `over_shoulder` | Over-shoulder — dialogue | 50mm |
| `low_angle` | Contre-plongée — héroïque | 28mm |
| `low_angle_close` | Contre-plongée serrée — dramatique | 35mm |
| `high_angle` | Plongée — vulnérabilité | 35mm |
| `bird_eye` | Vue aérienne | 28mm |
| `worm_eye` | Œil de ver — extrême | 14mm |
| `dutch_angle` | Angle hollandais — inquiétant | 35mm |
| `pov` | Point de vue subjectif | 50mm |

---

## Presets de lieux intégrés

| ID | Nom | Type | Tags |
|---|---|---|---|
| `ruelle_cyberpunk` | Ruelle Cyberpunk | exterior | cyberpunk, urban, night, neon, rain |
| `foret_brumeuse` | Forêt Brumeuse | exterior | forest, fog, nature, mystery, dawn |
| `bureau_sombre` | Bureau Sombre | interior | interior, office, dark, noir, dramatic |
| `studio_neutre` | Studio Neutre | interior | studio, neutral, clean, portrait |
| `desert` | Désert | exterior | desert, outdoor, sun, hot, western |

Ajouter un preset personnalisé :
```python
from blender_bridge import BlenderBridge, LocationPreset, SceneType, LightingConfig
bridge = BlenderBridge()
preset = LocationPreset(id="ma_cave", name="Cave Médiévale", scene_type=SceneType.INTERIOR)
bridge.locations.save_preset(preset)
```

---

## Système 2.5D (blender_projection)

Génère une illusion 3D contrôlée depuis une image source.

```bash
# Extérieur — skybox inversée + plantation d'arbres
blender -b -P generate_scene.py -- image.png exterior

# Depuis Python
from blender_projection.scene_builder import build_projected_scene
script = build_projected_scene("scene.png", "exterior", {
    "camera_mode": "low_angle",
    "plant_trees": True,
    "tree_count": 5,
    "engine": "EEVEE"
})
# → script Blender Python autonome prêt à exécuter
```

**Modes caméra 2.5D :** `wide` | `close` | `over_shoulder` | `low_angle` | `high_angle`

**Modes scène :** `exterior` (skybox inversée) | `interior` (pièce avec projection)

---

## Structure des fichiers

```
blender_bridge/
├── __init__.py              ← Façade BlenderBridge (point d'entrée)
├── scene_types.py           ← Contrat de données (SceneJSON, CameraConfig, etc.)
├── voice_bridge.py          ← Parser vocal → SceneJSON (grammaire déterministe)
├── script_generator.py      ← SceneJSON → script Python Blender
├── headless_runner.py       ← Exécution blender --background --python
├── camera_system.py         ← 11 types de plans cinématographiques
├── rig_generator.py         ← Rigs placeholder humanoïdes
├── location_manager.py      ← Presets de lieux + recherche narrative
├── backend_integration.py   ← Intégration pipeline narratif existant
├── cli.py                   ← Interface ligne de commande complète
└── presets/
    ├── locations/           ← Presets JSON utilisateur (sauvegardés)
    └── examples/            ← Exemples de SceneJSON complets

blender_projection/
├── __init__.py
├── scene_builder.py         ← Orchestrateur scènes 2.5D
├── asset_library.py         ← Bibliothèque d'assets (arbres, rochers, etc.)
├── asset_placer.py          ← Placement procédural dans Blender
└── reference_renderer.py    ← Presets de scènes de référence

config/
└── blender_config.json      ← Configuration Blender (chemin exe, résolution, etc.)
```

---

## Commande CLI minimale (une fois Blender configuré)

```bash
# Commande la plus simple possible
python -m blender_bridge.cli render "Ruelle cyberpunk sous pluie"

# Équivalent direct Blender
blender --background --python exports/blender/scripts/scene_ruelle_cyberpunk.py -- --frame 1
```

---

## Contraintes de conception

- ✅ Blender exécuté **exclusivement en mode headless** (`--background`)
- ✅ Architecture modulaire — chaque module a une responsabilité unique
- ✅ **Séparation stricte** : description narrative / description technique 3D / exécution Blender
- ✅ Scripts Blender générés **autonomes** — lisibles, modifiables, versionnables
- ✅ Grammaire vocale **déterministe** — pas de génération libre par LLM
- ✅ Aucun éditeur 3D custom — Blender est le seul moteur 3D
