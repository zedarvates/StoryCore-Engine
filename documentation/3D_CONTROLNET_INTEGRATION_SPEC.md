# Spécification Technique : Intégration Guidage 3D (Blender) vers ComfyUI (ControlNet)

## 1. Résumé du Problème
Assurer une cohérence spatiale parfaite entre les scènes 3D générées par `Blender Bridge` et le rendu final via `ComfyUI` en utilisant les passes de rendu Blender (Depth, Canny) comme entrées `ControlNet`.

## 2. Table des Compromis

| Critère | Solution Choisie | Pourquoi ? |
| :--- | :--- | :--- |
| **Performance** | Export via Nœuds de Composition Blender | Permet d'extraire toutes les passes en un seul passage de rendu. |
| **Complexité** | Format d'échange par dossier temporaire | Simple, robuste, facile à débugger et compatible avec les systèmes de fichiers. |
| **Maintenabilité** | Extension de `SceneJSON` | Centralise la configuration et évite la duplication de logique. |
| **Coût** | Zéro coût additionnel | Utilise les fonctionnalités natives de Blender et ComfyUI. |

## 3. Architecture Technique

### 3.1 Format d'Échange des Données
Les passes de rendu seront exportées dans un dossier structuré par scène et par frame.

**Structure du dossier :**
`exports/blender/controlnet/<scene_id>/<frame_id>/`

**Fichiers :**
- `render.png` : Rendu principal (RGB).
- `depth.png` : Carte de profondeur normalisée (0-1, 16-bit PNG recommandé).
- `canny.png` : Carte des contours (Outlines) générée via le filtre Sobel de Blender.
- `metadata.json` : Métadonnées sur les passes (résolution, force suggérée, type de ControlNet).

### 3.2 Modifications : `blender_bridge/scene_types.py`
Ajout du support pour l'export ControlNet dans `RenderSettings`.

```python
@dataclass
class RenderSettings:
    # ... existant ...
    controlnet_export: List[str] = field(default_factory=lambda: ["depth", "canny"])
```

### 3.3 Modifications : `blender_bridge/script_generator.py`
Mise à jour du template de rendu pour inclure les nœuds de composition.

```python
_COMPOSITION_TEMPLATE = '''
# Configuration de la composition pour l'export ControlNet
scene.use_nodes = True
nodes = scene.node_tree.nodes
links = scene.node_tree.links
nodes.clear()

render_layers = nodes.new('CompositorNodeRLayers')
file_output = nodes.new('CompositorNodeOutputFile')
file_output.base_path = r"{export_dir}"

# Passe Depth
map_value = nodes.new('CompositorNodeMapValue')
map_value.offset = [0]
map_value.size = [0.05] # Ajuster selon la scène
map_value.use_min = True
map_value.use_max = True
map_value.min = [0]
map_value.max = [1]

links.new(render_layers.outputs['Depth'], map_value.inputs[0])
file_output.file_slots.new('depth')
links.new(map_value.outputs[0], file_output.inputs['depth'])

# Passe Canny (via Filter Sobel)
filter_node = nodes.new('CompositorNodeFilter')
filter_node.filter_type = 'SOBEL'
links.new(render_layers.outputs['Image'], filter_node.inputs[0])
file_output.file_slots.new('canny')
links.new(filter_node.outputs[0], file_output.inputs['canny'])
'''
```

### 3.4 Modifications : `src/workflow_executor.py`
Support de multiples ControlNets dans `StoryCorePanelConfig`.

```python
@dataclass
class StoryCorePanelConfig:
    # ...
    controlnet_configs: List[ControlNetConfig] = field(default_factory=list)
```

Mise à jour de `_add_controlnet_nodes` pour chaîner les nœuds de conditionnement.

### 3.5 Modifications : `src/comfyui_image_engine.py`
Orchestration de la détection des passes Blender.

```python
def _prepare_controlnet_from_blender(self, scene_id: str, frame_id: str) -> List[ControlNetConfig]:
    export_dir = Path(f"exports/blender/controlnet/{scene_id}/{frame_id}/")
    configs = []
    if (export_dir / "depth.png").exists():
        configs.append(ControlNetConfig(model_name="control_depth_xl", control_image_path=export_dir / "depth.png"))
    if (export_dir / "canny.png").exists():
        configs.append(ControlNetConfig(model_name="control_canny_xl", control_image_path=export_dir / "canny.png"))
    return configs
```

## 4. Workflow Global

1. **Blender Bridge** : Reçoit une commande vocale, génère `SceneJSON` avec `controlnet_export` activé.
2. **Blender Headless** : Exécute le script généré, produit `render.png`, `depth.png`, `canny.png`.
3. **ComfyUI Service** : Détecte les fichiers, construit un workflow avec 2 nœuds ControlNet (Depth + Canny).
4. **ComfyUI Execution** : Génère l'image finale parfaitement alignée sur la géométrie 3D.

## 5. Points de Défaillance Futurs & Atténuation
- **Plage de profondeur (Depth Range)** : Si la scène est trop profonde, le `Map Value` peut saturer. *Mitigation* : Calculer dynamiquement l'offset/size basé sur la distance `clip_start`/`clip_end` de la caméra.
- **Épaisseur des traits Canny** : Le filtre Sobel peut être trop fin. *Mitigation* : Ajouter un nœud `Dilate/Erode` après le filtre Sobel dans Blender.
- **VRAM ComfyUI** : Multiplier les ControlNets consomme beaucoup de VRAM. *Mitigation* : Option pour désactiver un des deux ControlNets si la VRAM est < 8GB.
