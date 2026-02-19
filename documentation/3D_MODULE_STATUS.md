# Statut Module 3D — StoryCore-Engine

> Dernière mise à jour : Février 2026

## Résumé

Le moteur 3D est **opérationnel** en mode headless Blender.  
L'ancien système basé sur panda3d/open3d (mock mode) a été **remplacé** par une intégration complète avec Blender 4.x via scripts Python générés dynamiquement.

---

## État actuel

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Génération de scènes 3D depuis commande vocale | ✅ Opérationnel | `blender_bridge/voice_bridge.py` |
| Caméras cinématographiques (11 types de plans) | ✅ Opérationnel | `blender_bridge/camera_system.py` |
| Presets de lieux (5 intégrés) | ✅ Opérationnel | `blender_bridge/location_manager.py` |
| Rigs placeholder humanoïdes | ✅ Opérationnel | `blender_bridge/rig_generator.py` |
| Exécution Blender headless | ✅ Opérationnel* | `blender_bridge/headless_runner.py` |
| Génération de scripts Blender Python | ✅ Opérationnel | `blender_bridge/script_generator.py` |
| Projection 2.5D (image → scène 3D) | ✅ Opérationnel | `blender_projection/scene_builder.py` |
| Plantation procédurale d'assets | ✅ Opérationnel | `blender_projection/asset_placer.py` |
| Storyboard multi-beats | ✅ Opérationnel | `blender_bridge/backend_integration.py` |
| CLI complète | ✅ Opérationnel | `python -m blender_bridge.cli` |
| Tests unitaires | ✅ 85/85 passés | `tests/test_blender_bridge.py` |

> *Nécessite Blender installé et configuré dans `config/blender_config.json`

---

## Architecture

```
Commande vocale (FR/EN)
    ↓
VoiceToSceneBridge          grammaire deterministe, stable
    ↓
SceneJSON                   contrat de donnees (séparation narrative / technique)
    ↓
BlenderScriptGenerator      génère un .py autonome, lisible, versionnable
    ↓
BlenderHeadlessRunner       blender --background --python script.py
    ↓
render.png                  sortie finale → pipeline IA vidéo
```

**Séparation des couches (contrainte fondamentale) :**
```
Niveau 1 — Narratif    : "ruelle cyberpunk sous pluie, plan serré"
Niveau 2 — SceneJSON   : {camera: {lens: 35, shot: low_angle}, atmosphere: {type: rain}}
Niveau 3 — Script .py  : bpy.ops.camera_add(...), cam.lens = 35
Niveau 4 — Blender CLI : blender -b -P script.py
Niveau 5 — PNG         : image reference → IA video
```

---

## Prérequis

### Blender
Blender n'est **pas** dans `requirements.txt` (pas d'installation pip).  
C'est un exécutable indépendant.

1. Télécharger : https://www.blender.org/download/ (recommandé : 4.2 LTS)
2. Configurer le chemin dans `config/blender_config.json` :
   ```json
   { "executable": "C:/Program Files/Blender Foundation/Blender 4.2/blender.exe" }
   ```
   Ou via variable d'environnement : `BLENDER_EXECUTABLE=...`

### Vérifier
```bash
python -m blender_bridge.cli status
```

---

## Utilisation rapide

```bash
# Statut
python -m blender_bridge.cli status

# Générer un script (sans Blender)
python -m blender_bridge.cli script "Ruelle cyberpunk sous pluie"

# Dry-run complet
python -m blender_bridge.cli dry-run "Camera basse 35mm contre-plongee"

# Rendu complet (Blender requis)
python -m blender_bridge.cli render "Ruelle cyberpunk avec Alpha devant"

# Storyboard depuis fichier JSON
python -m blender_bridge.cli storyboard blender_bridge/presets/examples/storyboard_beats_example.json

# Projection 2.5D depuis image IA
python -m blender_bridge.cli project2d ./assets/generated/scene.png exterior --camera low_angle
```

---

## Commandes vocales reconnues

| Exemple | Effet |
|---|---|
| `"Ruelle cyberpunk sous pluie"` | preset `ruelle_cyberpunk` + atmosphère pluie |
| `"Foret brumeuse au lever du jour"` | preset `foret_brumeuse` + brume |
| `"Camera basse 35mm contre-plongee"` | `LOW_ANGLE` ou `LOW_ANGLE_CLOSE` + 35mm |
| `"Plan serre sur visage"` | `CLOSE_UP` + 85mm |
| `"Plan large grand angle"` | `WIDE` + 24mm |
| `"Over shoulder dialogue"` | `OVER_SHOULDER` + 50mm |
| `"Ajoute brouillard volumetrique dense"` | `VOLUMETRIC` × 1.5 |
| `"Alpha a 2 metres devant camera"` | rig `Alpha` à position calculée |

---

## Types de plans (11)

`wide` · `medium` · `close_up` · `over_shoulder` · `low_angle` · `low_angle_close` · `high_angle` · `bird_eye` · `worm_eye` · `dutch_angle` · `pov`

---

## Presets de lieux (5)

| ID | Nom | Type |
|---|---|---|
| `ruelle_cyberpunk` | Ruelle Cyberpunk | exterior |
| `foret_brumeuse` | Forêt Brumeuse | exterior |
| `bureau_sombre` | Bureau Sombre | interior |
| `studio_neutre` | Studio Neutre | interior |
| `desert` | Désert | exterior |

---

## Ancien système (déprécié)

L'ancien module `src/3d/` (CompositionEngine, panda3d/open3d) est **remplacé**.  
Il était en mode mock uniquement et ne produisait aucun rendu réel.  
Il peut être supprimé ou archivé sans impact sur le reste du projet.

---

## Fichiers

```
blender_bridge/           Pipeline vocal → JSON → Blender
blender_projection/       Projection 2.5D (image → illusion 3D)
config/blender_config.json Configuration Blender
blender_bridge_cli.bat    Raccourci CLI Windows
blender_bridge.sh         Raccourci CLI Linux/Mac
tests/test_blender_bridge.py  85 tests unitaires
documentation/BLENDER_INTEGRATION.md  Documentation complète
```
