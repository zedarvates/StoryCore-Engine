# Documentation des API Python - Migration vers Python

Ce document détaille les nouvelles API introduites lors de la migration vers Python, ainsi que les changements apportés aux API existantes.

---

## Table des Matières

1. [Aperçu des Changements](#aperçu-des-changements)
2. [Nouvelles API](#nouvelles-api)
   - [API de Gestion des Workflows](#api-de-gestion-des-workflows)
   - [API de Génération Vidéo](#api-de-génération-vidéo)
   - [API de Génération d'Images](#api-de-génération-dimages)
   - [API d'Intégration des Modèles](#api-dintégration-des-modèles)
3. [API Modifiées](#api-modifiées)
   - [API CLI](#api-cli)
   - [API de Configuration](#api-de-configuration)
4. [Exemples d'Utilisation](#exemples-dutilisation)
5. [Bonnes Pratiques](#bonnes-pratiques)

---

## Aperçu des Changements

La migration vers Python a introduit plusieurs nouvelles API pour améliorer la modularité et la flexibilité du système. Voici les principaux changements :

- **Nouvelle Architecture Modulaire** : Le CLI a été refactorisé en modules distincts pour une meilleure maintenabilité.
- **Nouvelles Fonctionnalités** : Ajout de workflows avancés pour la génération vidéo et image.
- **Améliorations des Performances** : Optimisation des processus de génération et de gestion des modèles.

---

## Nouvelles API

### API de Gestion des Workflows

L'API `AdvancedWorkflowManager` permet de gérer les workflows avancés pour la génération de contenu multimodal.

#### Classes et Méthodes Principales

##### `AdvancedWorkflowManager`

```python
from src.advanced_workflow_manager import AdvancedWorkflowManager

class AdvancedWorkflowManager:
    """Gestionnaire central pour les workflows avancés"""
    
    def __init__(self, config: AdvancedWorkflowConfig):
        """Initialise le gestionnaire de workflows avec une configuration"""
```

**Méthodes :**

- `get_available_workflows() -> Dict[str, List[str]]` : Retourne la liste des workflows disponibles.
- `route_request(request: Union[VideoRequest, ImageRequest]) -> str` : Achemine les requêtes vers le workflow optimal.
- `execute_workflow(workflow_id: str, **kwargs) -> WorkflowResult` : Exécute un workflow spécifique.

**Exemple d'Utilisation :**

```python
manager = AdvancedWorkflowManager(config)
workflow_id = manager.route_request(VideoRequest(
    prompt="Un chat marchant dans un jardin",
    style="realiste",
    duration=5.0
))
result = manager.execute_workflow(workflow_id)
```

---

### API de Génération Vidéo

L'API `EnhancedVideoEngine` offre des fonctionnalités avancées pour la génération vidéo.

#### Classes et Méthodes Principales

##### `EnhancedVideoEngine`

```python
from src.enhanced_video_engine import EnhancedVideoEngine

class EnhancedVideoEngine:
    """Moteur vidéo amélioré avec support des workflows avancés"""
```

**Méthodes :**

- `generate_video(request: VideoGenerationRequest) -> VideoResult` : Génère une vidéo en utilisant des workflows avancés.
- `batch_generate(requests: List[VideoGenerationRequest]) -> List[VideoResult]` : Génère plusieurs vidéos en lot.

**Exemple d'Utilisation :**

```python
engine = EnhancedVideoEngine(config)
result = engine.generate_video(VideoGenerationRequest(
    prompt="Un aigle majestueux survolant des montagnes",
    mode="high_quality",
    duration=8.0,
    resolution=(1080, 1920),
    enable_upscaling=True
))
```

---

### API de Génération d'Images

L'API `EnhancedImageEngine` permet de générer des images avec des workflows spécialisés.

#### Classes et Méthodes Principales

##### `EnhancedImageEngine`

```python
from src.enhanced_image_engine import EnhancedImageEngine

class EnhancedImageEngine:
    """Moteur d'images amélioré avec support des workflows avancés"""
```

**Méthodes :**

- `generate_image(request: ImageGenerationRequest) -> ImageResult` : Génère une image en utilisant des workflows avancés.

**Exemple d'Utilisation :**

```python
engine = EnhancedImageEngine(config)
result = engine.generate_image(ImageGenerationRequest(
    prompt="Une fille anime avec des cheveux bleus",
    mode="anime",
    resolution=(1024, 1024),
    style="detailed"
))
```

---

### API d'Intégration des Modèles

L'API `AdvancedModelManager` gère le chargement et la gestion des modèles avancés.

#### Classes et Méthodes Principales

##### `AdvancedModelManager`

```python
from src.advanced_model_manager import AdvancedModelManager

class AdvancedModelManager:
    """Gère le chargement et la mise en cache des modèles avancés"""
```

**Méthodes :**

- `load_model(model_name: str, **kwargs) -> bool` : Charge un modèle avec des optimisations.
- `get_model_info(model_name: str) -> ModelInfo` : Retourne des informations détaillées sur un modèle.
- `optimize_memory() -> MemoryReport` : Optimise l'utilisation de la mémoire.

**Exemple d'Utilisation :**

```python
manager = AdvancedModelManager()
manager.load_model("hunyuan_t2v", precision="fp16", enable_quantization=True)
info = manager.get_model_info("hunyuan_t2v")
```

---

## API Modifiées

### API CLI

L'API CLI a été refactorisée pour une meilleure modularité. Les commandes restent inchangées, mais les imports ont été mis à jour.

**Ancien Import :**

```python
from storycore_cli import InitHandler, GridHandler
```

**Nouvel Import :**

```python
from src.cli.handlers.init import InitHandler
from src.cli.handlers.grid import GridHandler
```

---

### API de Configuration

L'API de configuration a été mise à jour pour inclure de nouvelles options pour les workflows avancés.

**Nouvelle Configuration :**

```python
@dataclass
class AdvancedWorkflowConfig:
    model_precision: str = "fp16"
    enable_quantization: bool = True
    max_memory_usage_gb: float = 20.0
    batch_size: int = 1
    enable_caching: bool = True
    quality_threshold: float = 0.8
```

---

## Exemples d'Utilisation

### Exemple 1 : Génération Vidéo

```python
from src.enhanced_video_engine import EnhancedVideoEngine
from src.advanced_workflow_manager import AdvancedWorkflowManager

# Initialiser le gestionnaire de workflows
manager = AdvancedWorkflowManager(config)

# Générer une vidéo
engine = EnhancedVideoEngine(config)
result = engine.generate_video(VideoGenerationRequest(
    prompt="Un coucher de soleil sur une plage",
    mode="high_quality",
    duration=10.0
))

print(f"Vidéo générée : {result.video_path}")
```

### Exemple 2 : Génération d'Images

```python
from src.enhanced_image_engine import EnhancedImageEngine

# Initialiser le moteur d'images
engine = EnhancedImageEngine(config)

# Générer une image
result = engine.generate_image(ImageGenerationRequest(
    prompt="Un paysage de montagne enneigée",
    mode="professional_edit",
    resolution=(2048, 2048)
))

print(f"Image générée : {result.image_path}")
```

---

## Bonnes Pratiques

1. **Utilisation des Configurations** : Toujours initialiser les API avec une configuration appropriée pour optimiser les performances.
2. **Gestion des Erreurs** : Utiliser les mécanismes de gestion des erreurs pour gérer les exceptions et les échecs de workflow.
3. **Optimisation des Ressources** : Surveiller et optimiser l'utilisation de la mémoire et des ressources système.
4. **Tests et Validation** : Tester les intégrations avec des cas d'utilisation réels pour garantir la compatibilité et la performance.

---

## Conclusion

Cette documentation couvre les nouvelles API introduites lors de la migration vers Python. Pour plus d'informations, consultez les guides spécifiques dans le dossier [documentation/](documentation/).
