# StoryCore Asset Creator — Addon Blender 4.x

Addon Blender officiel du projet **StoryCore-Engine**.

Crée des assets 3D de haute qualité depuis des images (photo ou générée par IA)  
via **ComfyUI + Trellis2**, directement depuis le panneau N de Blender.

---

## Pipelines disponibles

| Pipeline | Entrée | Sortie |
|---|---|---|
| **Image → 3D** | Toute image PNG/JPG | Mesh 3D texturé (GLB) |
| **Personnage → Puppet** | Image de personnage | Mesh 3D + Armature articulée (22 os) |
| **Organique (arbre/plante)** | Image de tronc seul | Mesh tronc 3D + Feuillage procédural |

---

## Configuration ComfyUI (PORT — À LIRE EN PREMIER)

Le port ComfyUI **n'est jamais supposé** — il varie selon l'édition installée :

| Édition | Port par défaut |
|---|---|
| ComfyUI Standard (github) | **8188** |
| ComfyUI Desktop (app officielle) | **8000** |
| ComfyUI Remote/serveur | custom |

### Fichier de config (méthode recommandée)

Éditez **`config/comfyui_config.json`** à la racine du projet StoryCore :

```json
{
    "host": "127.0.0.1",
    "port": 8188,
    "timeout_seconds": 300,
    "poll_interval_seconds": 2.0
}
```

→ **Pour ComfyUI Desktop** : changez `"port": 8188` en `"port": 8000`  
→ **Pour ComfyUI remote** : changez `"host"` par l'IP de votre serveur

### Ordre de priorité de lecture

```
1. config/comfyui_config.json      ← méthode recommandée
2. Blender Preferences de l'addon  ← override ponctuel
3. Variables d'environnement       ← STORYCORE_COMFYUI_HOST / STORYCORE_COMFYUI_PORT
```

### Override via variables d'environnement

```bash
# Linux/Mac
export STORYCORE_COMFYUI_PORT=8000
export STORYCORE_COMFYUI_HOST=192.168.1.42

# Windows CMD
set STORYCORE_COMFYUI_PORT=8000

# Windows PowerShell
$env:STORYCORE_COMFYUI_PORT = "8000"
```

---

## Installation

### 1. Prérequis

- **Blender 4.0+**
- **ComfyUI** lancé en local (`localhost:8188`)
- **ComfyUI Trellis2** installé dans ComfyUI
- Python `requests` installé dans Blender :

```bash
# Dans le terminal Python de Blender (Edit > Preferences > Python)
import subprocess, sys
subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
```

### 2. Workflows ComfyUI

Copiez vos workflows Trellis2 dans le dossier `workflows/` :

```
workflows/
  trellis2_lowvram.json    ← workflow Low VRAM (recommandé)
  trellis2_standard.json   ← workflow qualité standard
  trellis2_lowpoly.json    ← workflow low poly
  trellis2_trunk_only.json ← workflow tronc seul (inclus)
```

> Les workflows `PixelArtistry_Trellis2_*.json` de votre dossier `Downloads/3s/`  
> doivent être copiés ici et renommés selon la convention ci-dessus.

### 3. Installation de l'addon

```
1. Zipper le dossier storycore_asset_creator/
2. Blender > Edit > Preferences > Add-ons > Install...
3. Sélectionner le ZIP
4. Activer "StoryCore Asset Creator"
5. Configurer : ComfyUI Host (127.0.0.1) et Port (8188)
```

---

## Utilisation

### Panneau N (View3D)

1. Ouvrir Blender, passer en **3D Viewport**
2. Appuyer sur **N** pour ouvrir le panneau latéral
3. Aller dans l'onglet **StoryCore**

### Pipeline Image → 3D

```
1. Sélectionner une image source (ratio 1:1 recommandé)
2. Nommer l'asset
3. Choisir la qualité (Low VRAM pour commencer)
4. Cliquer "Image → 3D"
5. L'asset GLB est automatiquement importé dans la scène
```

### Pipeline Personnage → Puppet

```
1. Sélectionner une image de personnage (fond uni recommandé)
2. Renseigner le nom du personnage
3. Cliquer "Créer Puppet"
4. Le mesh 3D + l'armature humanoïde sont créés dans la scène
5. Le mesh est automatiquement parenté à l'armature (Automatic Weights)
```

**Bones créés (22 os) :**
```
Hips → Spine → Chest → Neck → Head
                     → Shoulder.L/R → UpperArm.L/R → LowerArm.L/R → Hand.L/R
       → UpperLeg.L/R → LowerLeg.L/R → Foot.L/R
```

### Pipeline Organique (arbres, plantes)

```
1. Fournir une image de TRONC SEUL (sans feuilles, fond uni)
   ⚠️ Important: PAS de feuilles sur l'image du tronc !
2. Choisir le style de feuillage
3. Ajuster la densité
4. Cliquer "Créer Arbre/Plante"
```

**Styles de feuillage :**
- `deciduous` — Feuillu (chêne, hêtre...)
- `conifer` — Conifère (sapin, épicéa...)
- `palm` — Palmier
- `bush` — Arbuste dense
- `dead` — Arbre mort (branches nues)
- `tropical` — Végétation tropicale

---

## Structure du code

```
storycore_asset_creator/
├── addon.json                    ← Manifeste addon StoryCore
├── README.md                     ← Ce fichier
├── src/
│   ├── __init__.py               ← Enregistrement Blender (panels, operators, prefs)
│   ├── comfyui_client.py         ← Client HTTP ComfyUI (upload, queue, polling)
│   ├── trellis_workflows.py      ← Manipulation des workflows JSON Trellis2
│   ├── pipeline_image_to_3d.py   ← Pipeline Image → GLB (Trellis2)
│   ├── pipeline_puppet.py        ← Pipeline Personnage → Mesh + Armature
│   └── pipeline_organic.py       ← Pipeline Tronc → Mesh + Feuillage procédural
└── workflows/
    ├── trellis2_lowvram.json      ← Workflow ComfyUI (à copier)
    ├── trellis2_standard.json     ← Workflow ComfyUI (à copier)
    ├── trellis2_lowpoly.json      ← Workflow ComfyUI (à copier)
    └── trellis2_trunk_only.json   ← Workflow tronc seul (placeholder inclus)
```

---

## Conseils pour de meilleurs résultats

### Images source optimales
- **Format** : PNG avec fond transparent ou fond uni
- **Ratio** : 1:1 (carré) — ex: 1024×1024
- **Éclairage** : uniforme, pas de fortes ombres
- **Sujet** : centré, occupant ~80% du cadre

### Pour les troncs d'arbres
- Photographier le tronc SEUL, sans feuilles ni branches
- Fond blanc ou uni
- Vue de face ou légèrement de côté

### Pour les personnages
- Pose T-pose ou A-pose recommandée
- Fond uni (blanc, gris, vert)
- Corps entier visible

### Choix du preset
| Preset | VRAM | Temps | Qualité |
|---|---|---|---|
| Low VRAM | 4-6 GB | ~60s | Bonne |
| Standard | 8-12 GB | ~120s | Excellente |
| Low Poly | 4-6 GB | ~45s | Stylisée |

---

## Intégration avec blender_bridge / blender_projection

Cet addon s'intègre avec les autres modules StoryCore :

```python
# Depuis blender_projection : utiliser les assets générés
from blender_projection.asset_placer import AssetPlacer

placer = AssetPlacer()
# L'asset créé par storycore_asset_creator est disponible en GLB
# dans exports/assets_3d/ et peut être placé avec AssetPlacer
```

---

## Dépannage

**ComfyUI non accessible**
- Vérifier que ComfyUI tourne : `http://127.0.0.1:8188`
- Cliquer "Tester ComfyUI" dans le panneau

**`requests` non trouvé**
```bash
# Dans le terminal système :
"C:\Program Files\Blender Foundation\Blender 4.x\4.x\python\bin\python.exe" -m pip install requests
```

**Timeout de génération**
- Augmenter le timeout dans les préférences
- Utiliser le preset "Low VRAM" pour commencer

**GLB mal importé**
- Vérifier que "Importation glTF 2.0" est activé dans les add-ons Blender
- Blender > Edit > Preferences > Add-ons > "glTF 2.0 format"

---

*StoryCore-Engine — Pipeline de mise en scène narrative automatisée*
