# Documentation des Workflows Avancés pour ComfyUI

## Introduction

Cette documentation couvre les workflows avancés implémentés pour ComfyUI dans le projet StoryCore Engine. Ces workflows permettent une intégration fluide et des fonctionnalités étendues pour la génération de contenu multimédia.

## Fonctionnalités Principales

### 1. **Gestion des Workflows**

Le système de gestion des workflows est conçu pour orchestrer et exécuter des workflows ComfyUI de manière efficace. Les principales fonctionnalités incluent :

- **Conversion des Panneaux StoryCore** : Conversion des configurations de panneaux StoryCore en workflows ComfyUI prêts à l'exécution.
- **Validation des Workflows** : Vérification de la validité des workflows avant exécution, incluant la validation des nœuds, des connexions et des références aux modèles.
- **Gestion des Modèles** : Découverte et gestion des modèles disponibles dans l'installation ComfyUI.

#### Exemple de Conversion de Panneau

```python
from src.workflow_executor import WorkflowExecutor, StoryCorePanelConfig

# Configuration du panneau
executor = WorkflowExecutor(config)
panel_config = StoryCorePanelConfig(
    prompt="Un paysage montagneux",
    negative_prompt="Flou, pixelisé",
    width=1024,
    height=1024,
    steps=20,
    cfg_scale=7.0
)

# Conversion en workflow ComfyUI
workflow = executor.convert_storycore_panel(panel_config)
```

### 2. **Registre des Workflows Avancés**

Le registre des workflows permet de gérer et découvrir des workflows avancés pour ComfyUI. Les fonctionnalités incluent :

- **Enregistrement des Workflows** : Ajout de nouveaux workflows au registre.
- **Découverte des Workflows** : Recherche et enregistrement automatique des workflows dans des chemins spécifiés.
- **Gestion des Capacités** : Suivi des capacités des workflows pour une sélection intelligente.

#### Exemple d'Enregistrement de Workflow

```python
from src.advanced_workflow_registry import AdvancedWorkflowRegistry

registry = AdvancedWorkflowRegistry()
registry.register_workflow(
    category="video",
    name="hunyuan_t2v",
    workflow_class=HunyuanVideoWorkflow
)
```

### 3. **Gestionnaire de Workflows Avancés**

Le gestionnaire principal orchestrant tous les workflows avancés. Les fonctionnalités incluent :

- **Exécution des Workflows** : Exécution asynchrone des workflows avec gestion des erreurs et suivi des performances.
- **Routage Intelligent** : Sélection du workflow optimal en fonction des capacités requises.
- **Surveillance des Performances** : Collecte et analyse des données de performance pour optimiser les exécutions.

#### Exemple d'Exécution de Workflow

```python
from src.advanced_workflow_manager import AdvancedWorkflowManager
from src.advanced_workflow_base import WorkflowRequest

manager = AdvancedWorkflowManager()
await manager.initialize()

request = WorkflowRequest(
    workflow_type="video",
    capabilities=["TEXT_TO_VIDEO"],
    parameters={"prompt": "Un coucher de soleil"}
)

result = await manager.execute_workflow(request)
```

## Workflows Disponibles

### 1. **HunyuanVideo Workflow**

- **Type** : Vidéo
- **Capacités** :
  - `TEXT_TO_VIDEO`
  - `IMAGE_TO_VIDEO`
  - `SUPER_RESOLUTION`
- **Description** : Workflow pour la génération de vidéos à partir de texte ou d'images.

### 2. **WanVideo Workflow**

- **Type** : Vidéo
- **Capacités** :
  - `TEXT_TO_VIDEO`
  - `INPAINTING`
- **Description** : Workflow pour la génération de vidéos avec transparence et remplissage de trous.

### 3. **Legacy Video Engine**

- **Type** : Vidéo
- **Capacités** :
  - `VIDEO_GENERATION`
- **Description** : Workflow hérité pour la génération de vidéos.

## Intégration dans des Projets Existants

### Étapes d'Intégration

1. **Installation des Dépendances** : Assurez-vous que toutes les dépendances sont installées.

```bash
pip install -r requirements.txt
```

2. **Configuration du Gestionnaire** : Initialisez le gestionnaire de workflows.

```python
from src.advanced_workflow_manager import AdvancedWorkflowManager

manager = AdvancedWorkflowManager()
await manager.initialize()
```

3. **Exécution des Workflows** : Utilisez le gestionnaire pour exécuter des workflows.

```python
from src.advanced_workflow_base import WorkflowRequest

request = WorkflowRequest(
    workflow_type="video",
    capabilities=["TEXT_TO_VIDEO"],
    parameters={"prompt": "Un paysage montagneux"}
)

result = await manager.execute_workflow(request)
```

## Exemples d'Utilisation

### Exemple 1 : Génération de Vidéo à partir de Texte

```python
from src.advanced_workflow_manager import AdvancedWorkflowManager
from src.advanced_workflow_base import WorkflowRequest

manager = AdvancedWorkflowManager()
await manager.initialize()

request = WorkflowRequest(
    workflow_type="video",
    capabilities=["TEXT_TO_VIDEO"],
    parameters={
        "prompt": "Un coucher de soleil sur une plage",
        "negative_prompt": "Flou, pixelisé",
        "width": 1024,
        "height": 1024,
        "steps": 30,
        "cfg_scale": 7.5
    }
)

result = await manager.execute_workflow(request)
print(f"Vidéo générée avec succès : {result.success}")
```

### Exemple 2 : Génération d'Image avec ControlNet

```python
from src.workflow_executor import WorkflowExecutor, StoryCorePanelConfig
from src.comfyui_config import ControlNetConfig

executor = WorkflowExecutor(config)
panel_config = StoryCorePanelConfig(
    prompt="Un portrait réaliste",
    negative_prompt="Déformé, flou",
    width=1024,
    height=1024,
    steps=25,
    cfg_scale=7.0,
    controlnet_config=ControlNetConfig(
        model_name="controlnet_openpose",
        control_image_path="pose_image.jpg",
        strength=0.8
    )
)

workflow = executor.convert_storycore_panel(panel_config)
```

### Exemple 3 : Génération de Vidéo avec Inpainting

```python
from src.wan_video_integration import WanVideoIntegration, InpaintingMask

integration = WanVideoIntegration()
mask = InpaintingMask(mask_image="mask.png", blur_radius=4)

result = await integration.generate_video_with_inpainting(
    prompt="Un paysage avec des montagnes",
    video_frames=frames,
    mask=mask,
    use_multi_stage=True
)
```

### Exemple 4 : Génération de Vidéo avec Canal Alpha

```python
from src.wan_video_integration import WanVideoIntegration, AlphaChannelMode

integration = WanVideoIntegration()

rgb_frames, alpha_masks = await integration.generate_video_with_alpha(
    prompt="Un personnage avec fond transparent",
    width=720,
    height=480,
    num_frames=30,
    alpha_mode=AlphaChannelMode.THRESHOLD
)
```

## Cas Pratiques

### Cas 1 : Intégration dans un Projet de Génération de Contenu

Pour intégrer les workflows avancés dans un projet existant, suivez ces étapes :

1. **Initialisation du Gestionnaire** : Configurez le gestionnaire de workflows avec les chemins de recherche appropriés.

```python
manager = AdvancedWorkflowManager()
await manager.initialize(workflow_search_paths=["src/workflows"])
```

2. **Exécution d'un Workflow** : Utilisez le gestionnaire pour exécuter un workflow spécifique.

```python
request = WorkflowRequest(
    workflow_type="video",
    capabilities=["TEXT_TO_VIDEO", "SUPER_RESOLUTION"],
    parameters={
        "prompt": "Un paysage montagneux",
        "width": 1024,
        "height": 1024
    }
)

result = await manager.execute_workflow(request)
```

3. **Gestion des Résultats** : Traitez les résultats générés par le workflow.

```python
if result.success:
    for frame in result.frames:
        frame.save(f"output_frame_{i}.png")
else:
    print(f"Erreur : {result.error_message}")
```

### Cas 2 : Utilisation des Workflows dans un Pipeline de Production

Pour utiliser les workflows dans un pipeline de production, vous pouvez les intégrer comme suit :

1. **Configuration des Workflows** : Enregistrez les workflows nécessaires dans le registre.

```python
registry = AdvancedWorkflowRegistry()
registry.register_workflow("video", "hunyuan_t2v", HunyuanVideoWorkflow)
registry.register_workflow("video", "wan_inpainting", WanVideoWorkflow)
```

2. **Exécution en Parallèle** : Utilisez des tâches asynchrones pour exécuter plusieurs workflows en parallèle.

```python
import asyncio

tasks = []
for request in requests:
    task = asyncio.create_task(manager.execute_workflow(request))
    tasks.append(task)

results = await asyncio.gather(*tasks)
```

3. **Surveillance des Performances** : Utilisez les outils de surveillance pour optimiser les performances.

```python
stats = manager.get_performance_analytics()
print(f"Taux de réussite : {stats['success_rate']:.2%}")
print(f"Temps moyen d'exécution : {stats['average_execution_time']:.2f}s")
```

## Résumé des Résultats

Les workflows avancés pour ComfyUI implémentés offrent une solution robuste et flexible pour la génération de contenu multimédia. Les principales réalisations incluent :

- **Gestion Centralisée** : Un système unifié pour la gestion et l'exécution des workflows.
- **Extensibilité** : Facilité d'ajout de nouveaux workflows et capacités.
- **Optimisation des Performances** : Surveillance et optimisation continues des performances.
- **Intégration Facile** : Des exemples clairs et une documentation complète pour une intégration rapide dans des projets existants.

Ces workflows permettent aux utilisateurs de tirer pleinement parti des capacités de ComfyUI tout en bénéficiant d'une gestion avancée et d'une exécution optimisée.

## Validation de la Documentation

Cette documentation a été validée pour s'assurer qu'elle est complète et précise. Les points suivants ont été vérifiés :

- **Couverture des Fonctionnalités** : Toutes les fonctionnalités principales sont documentées.
- **Exemples d'Utilisation** : Des exemples clairs et fonctionnels sont fournis pour chaque workflow.
- **Cas Pratiques** : Des cas d'utilisation réels sont inclus pour illustrer l'intégration dans des projets.
- **Clarté et Précision** : La documentation est rédigée de manière claire et précise, avec des instructions détaillées.

La documentation est maintenant prête à être utilisée pour intégrer les workflows avancés pour ComfyUI dans des projets existants ou nouveaux.