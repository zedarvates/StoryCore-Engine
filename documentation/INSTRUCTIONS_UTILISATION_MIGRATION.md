# Instructions d'Utilisation - Migration vers Python

Ce document fournit des instructions détaillées pour utiliser le projet StoryCore-Engine après la migration vers Python. Il inclut des guides pour l'installation, la configuration, l'exécution des commandes, et la gestion des workflows.

---

## Table des Matières

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Exécution des Commandes](#exécution-des-commandes)
4. [Gestion des Workflows](#gestion-des-workflows)
5. [Dépannage](#dépannage)

---

## Installation

### Prérequis

Assurez-vous d'avoir les éléments suivants installés sur votre système :

- Python 3.8 ou supérieur
- pip (gestionnaire de paquets Python)
- Git (pour cloner le dépôt)

### Étapes d'Installation

1. **Cloner le dépôt** :

```bash
git clone https://github.com/storycore/storycore-engine.git
cd storycore-engine
```

2. **Installer les dépendances** :

```bash
pip install -r requirements.txt
```

3. **Installer les dépendances de développement (optionnel)** :

```bash
pip install -e ".[dev]"
```

---

## Configuration

### Configuration de Base

Le projet utilise un fichier de configuration pour gérer les paramètres des workflows. Vous pouvez créer un fichier de configuration de base en exécutant la commande suivante :

```bash
python storycore.py init-config
```

Cette commande génère un fichier de configuration par défaut dans le répertoire `config/`.

### Configuration Avancée

Pour configurer des paramètres spécifiques, modifiez le fichier de configuration généré. Voici un exemple de configuration avancée :

```json
{
    "advanced_workflows": {
        "enabled": true,
        "default_video_workflow": "auto",
        "default_image_workflow": "auto",
        "quality_threshold": 0.8,
        "enable_optimization": true
    },
    "model_precision": "fp16",
    "enable_quantization": true,
    "max_memory_usage_gb": 20.0
}
```

---

## Exécution des Commandes

### Commandes CLI

Le projet StoryCore-Engine fournit une interface en ligne de commande (CLI) pour exécuter diverses tâches. Voici quelques commandes courantes :

#### Initialisation d'un Projet

```bash
python storycore.py init mon-projet
```

#### Génération d'une Grille

```bash
python storycore.py grid --project mon-projet
```

#### Promotion des Panneaux

```bash
python storycore.py promote --project mon-projet
```

#### Exécution de la QA

```bash
python storycore.py qa --project mon-projet
```

#### Exportation des Résultats

```bash
python storycore.py export --project mon-projet
```

### Commandes Avancées

#### Génération Vidéo

```bash
python storycore.py video --mode enhanced --workflow hunyuan_t2v \
    --prompt "Un chat marchant dans un jardin" --duration 5 --quality high
```

#### Génération d'Images

```bash
python storycore.py image --mode enhanced --workflow newbie_anime \
    --prompt "Une fille anime avec des cheveux bleus" --style detailed
```

#### Analyse de Qualité

```bash
python storycore.py analyze --input video.mp4 --type video --detailed
```

---

## Gestion des Workflows

### Workflows Disponibles

Le projet StoryCore-Engine prend en charge plusieurs workflows pour la génération de contenu multimodal. Voici une liste des workflows disponibles :

#### Workflows Vidéo

- `hunyuan_t2v` : Génération vidéo à partir de texte
- `hunyuan_i2v` : Génération vidéo à partir d'une image
- `wan_inpaint` : Génération vidéo avec inpainting
- `wan_alpha` : Génération vidéo avec canal alpha

#### Workflows Image

- `newbie_anime` : Génération d'images de style anime
- `qwen_relight` : Rééclairage d'images
- `qwen_edit` : Édition d'images
- `qwen_layered` : Génération d'images en couches

### Exécution d'un Workflow

Pour exécuter un workflow spécifique, utilisez la commande suivante :

```bash
python storycore.py execute-workflow --workflow hunyuan_t2v --prompt "Un coucher de soleil sur une plage"
```

---

## Dépannage

### Problèmes Courants

#### Erreur de Module Non Trouvé

Si vous rencontrez une erreur de module non trouvé, assurez-vous que toutes les dépendances sont installées :

```bash
pip install -r requirements.txt
```

#### Problèmes de Configuration

Si vous rencontrez des problèmes de configuration, vérifiez que le fichier de configuration est correctement formaté et que tous les champs requis sont présents.

#### Problèmes de Mémoire

Si vous rencontrez des problèmes de mémoire, réduisez la taille des lots ou utilisez une précision inférieure pour les modèles :

```json
{
    "model_precision": "fp8",
    "max_memory_usage_gb": 10.0
}
```

---

## Conclusion

Ce document fournit des instructions détaillées pour utiliser le projet StoryCore-Engine après la migration vers Python. Pour plus d'informations, consultez les guides spécifiques dans le dossier [documentation/](documentation/).
