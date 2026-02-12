# Téléchargement Automatique des Modèles ComfyUI pour StoryCore

## Vue d'ensemble

StoryCore-Engine inclut maintenant un système de téléchargement automatique des modèles ComfyUI. Ce système détecte automatiquement les modèles manquants et les télécharge depuis HuggingFace lors du démarrage de ComfyUI.

## Modèles Automatiquement Téléchargés

Le système télécharge automatiquement les modèles suivants pour le pipeline FLUX.2 :

### Core FLUX.2 (Obligatoires)
- **flux2-vae.safetensors** (335 MB) - VAE essentiel pour décodage d'images
- **flux2_dev_fp8mixed.safetensors** (3.5 GB) - Modèle de diffusion principal
- **mistral_3_small_flux2_bf16.safetensors** (7.2 GB) - Encodeur de texte Mistral

### FLUX.2-klein (Léger - Optionnel)
- **flux2-klein.safetensors** (9.3 GB) - Version légère pour machines modestes
- **ae.safetensors** (335 MB) - VAE alternatif pour FLUX.2-klein

### Text Encoders Avancés (Optionnels)
- **t5xxl_fp16.safetensors** (9.5 GB) - Encodeur T5-XXL pour prompts complexes

### Video Generation - LTX-2 (Optionnels)
- **ltx-2-19b-dev.safetensors** (37 GB) - Modèle vidéo principal haute qualité
- **ltx-2-19b-dev-fp8.safetensors** (9.3 GB) - Version optimisée FP8
- **gemma_3_12B_it.safetensors** (24 GB) - Encodeur de texte pour vidéo
- **ltx-2-19b-distilled-lora-384.safetensors** (150 MB) - LoRA d'optimisation
- **ltx-2-19b-lora-camera-control-dolly-left.safetensors** (150 MB) - Contrôle caméra
- **ltx-2-spatial-upscaler-x2-1.0.safetensors** (500 MB) - Upscaler spatial

## Utilisation

### Démarrage Automatique (Recommandé)

Utilisez le script de démarrage automatique qui vérifie et télécharge les modèles avant de lancer ComfyUI :

```bash
# Depuis la racine du projet StoryCore
python tools/comfyui_installer/start_comfyui_with_models.py
```

Ce script :
1. ✅ Vérifie les modèles existants
2. 📥 Télécharge automatiquement les modèles manquants
3. 🌐 Lance ComfyUI avec les bons paramètres CORS

### Vérification Manuelle

Pour vérifier l'état des modèles sans les télécharger :

```bash
python src/auto_model_downloader.py --check-only
```

### Téléchargement Manuel

Pour forcer le téléchargement de tous les modèles :

```bash
python src/auto_model_downloader.py
```

## Configuration

### Chemins des Modèles

Les modèles sont automatiquement téléchargés vers :
```
comfyui_portable/ComfyUI/models/
├── vae/flux2-vae.safetensors
├── checkpoints/flux2_dev_fp8mixed.safetensors
└── clip/mistral_3_small_flux2_bf16.safetensors
```

### Configuration Personnalisée

Vous pouvez spécifier un chemin ComfyUI personnalisé :

```bash
python src/auto_model_downloader.py --comfyui-path /chemin/vers/comfyui
```

## Architecture du Système

### Composants

1. **`src/auto_model_downloader.py`** - Moteur principal de téléchargement
2. **`tools/comfyui_installer/start_comfyui_with_models.py`** - Script de démarrage intégré
3. **`tools/comfyui_installer/validate_models.sh`** - Validation des modèles (legacy)

### Fonctionnalités

- **Vérification de taille** : Validation que les téléchargements sont complets
- **Reprise de téléchargement** : Détection et reprise des téléchargements interrompus
- **Téléchargement asynchrone** : Téléchargement parallèle pour de meilleures performances
- **Gestion d'erreurs** : Gestion robuste des erreurs réseau et de disque
- **Logs détaillés** : Suivi complet du processus de téléchargement

## Intégration avec l'Interface Utilisateur

### Dashboard StoryCore

Le dashboard StoryCore (`storycore-dashboard-demo.html`) affiche maintenant :
- ✅ Statut opérationnel du backend ComfyUI
- 🎨 Bouton "Open ComfyUI Interface"
- 🔍 Bouton "Check Backend Status"

### Interface de Téléchargement

L'interface utilisateur (`ModelDownloadModalEnhanced.tsx`) fournit :
- Téléchargement automatique depuis l'interface web
- Fallback vers ComfyUI Manager si nécessaire
- Support WSL et chemins UNC
- Mode manuel et automatique

## Dépannage

### Problèmes Courants

#### 1. Erreur de chemin UNC (Windows/WSL)
```
UNC Path Access Denied: Cannot write to \\wsl.localhost\...
```
**Solution** : Lancez en tant qu'administrateur ou utilisez le mode manuel.

#### 2. Erreur réseau
```
Failed to download model: Network timeout
```
**Solution** : Vérifiez votre connexion internet et réessayez.

#### 3. Espace disque insuffisant
```
No space left on device
```
**Solution** : Libérez de l'espace disque (besoin de ~12 GB).

### Logs de Diagnostic

Les logs détaillés sont disponibles dans la console :
```
2026-01-21 09:46:08,959 - INFO - ⬇️  Downloading flux2-vae.safetensors...
2026-01-21 09:46:09,350 - INFO -    flux2-vae.safetensors: 2.3%
```

### Validation Manuelle

Utilisez le script de validation legacy :
```bash
./tools/comfyui_installer/validate_models.sh
```

## Performance

### Temps de Téléchargement Estimés

- **flux2-vae.safetensors** : 30-60 secondes (335 MB)
- **flux2_dev_fp8mixed.safetensors** : 5-10 minutes (3.5 GB)
- **mistral_3_small_flux2_bf16.safetensors** : 10-15 minutes (7.2 GB)

### Optimisations

- Téléchargement asynchrone avec `aiohttp`
- Vérification de taille pour éviter les retéléchargements
- Reprise automatique des téléchargements interrompus

## Sécurité

### Validation des Téléchargements

- Vérification des sommes de contrôle (SHA256)
- Validation des tailles de fichiers
- Téléchargement depuis sources officielles HuggingFace uniquement

### Permissions

- Création automatique des répertoires nécessaires
- Gestion correcte des permissions fichiers
- Support des environnements WSL et natifs

## Extensions et Personnalisation

### Ajout de Nouveaux Modèles

Modifiez `src/auto_model_downloader.py` :

```python
def _get_required_models(self) -> List[ModelInfo]:
    return [
        # Modèles existants...
        ModelInfo(
            name="nouveau_modele.safetensors",
            url="https://huggingface.co/...",
            subfolder="loras",
            expected_size_mb=500
        ),
    ]
```

### Intégration avec d'Autres Pipelines

Le système peut être étendu pour supporter :
- Stable Diffusion (SDXL, SD 3.0)
- Autres architectures (Llama, GPT)
- Modèles personnalisés

## Migration depuis l'Ancien Système

### Ancien système (manuel)
```bash
# Téléchargement manuel depuis tools/comfyui_installer/models_links.txt
# Puis validation avec validate_models.sh
```

### Nouveau système (automatique)
```bash
# Un seul script fait tout
python tools/comfyui_installer/start_comfyui_with_models.py
```

## Support et Maintenance

### Mises à Jour des Modèles

Le système peut être mis à jour pour :
- Nouvelles versions des modèles FLUX.2
- Ajout de modèles pour de nouveaux pipelines
- Optimisations de performance

### Monitoring

Intégration avec les systèmes de monitoring existants :
- Logs centralisés
- Métriques de performance
- Alertes de santé des modèles

---

## Résumé

Le système de téléchargement automatique des modèles ComfyUI transforme l'expérience utilisateur de StoryCore :

- **Avant** : Installation manuelle complexe, téléchargements séparés, configuration manuelle
- **Après** : Un clic pour tout configurer automatiquement

Le système garantit que ComfyUI est toujours prêt avec les bons modèles pour les workflows StoryCore, éliminant les erreurs de configuration et réduisant le temps de mise en route.