# Guide du Système de Mémoire LLM

## Table des Matières

1. [Introduction](#introduction)
2. [Guide Utilisateur](#guide-utilisateur)
   - [README](#readme)
   - [Structure des Répertoires](#structure-des-répertoires)
   - [Commandes CLI](#commandes-cli)
3. [Guide Développeur](#guide-développeur)
   - [Architecture](#architecture)
   - [API](#api)
   - [Stratégie de Test](#stratégie-de-test)

## Introduction

Le système de mémoire LLM de StoryCore Engine est conçu pour gérer et organiser les données de projet, les discussions, les actifs et les états de mémoire. Il fournit une infrastructure robuste pour la gestion des projets créatifs et techniques.

## Guide Utilisateur

### README

Le système de mémoire LLM est un composant central de StoryCore Engine qui permet de gérer les projets de manière structurée. Il offre des fonctionnalités pour enregistrer les discussions, gérer les actifs, et maintenir un état de mémoire cohérent.

### Structure des Répertoires

La structure des répertoires d'un projet StoryCore est organisée comme suit :

```
project_root/
├── assistant/
│   ├── discussions_raw/
│   ├── discussions_summary/
│   ├── memory.json
│   └── variables.json
├── assets/
│   ├── images/
│   ├── audio/
│   ├── video/
│   └── documents/
├── build_logs/
├── summaries/
├── qa_reports/
└── project_config.json
```

### Commandes CLI

Le système de mémoire LLM offre plusieurs commandes CLI pour interagir avec le système :

#### 1. `memory-export`

Exporte les données du système de mémoire.

**Utilisation :**

```bash
storycore memory-export --project <project_path> --output <output_path> --format <format> --scope <scope>
```

**Options :**

- `--project` : Chemin vers le répertoire du projet (par défaut : répertoire courant)
- `--output` : Répertoire ou fichier de sortie pour l'export
- `--format` : Format d'export (directory, zip, tar)
- `--scope` : Portée de l'export (memory, discussions, assets, config, all)
- `--include-summaries` : Inclure les résumés générés dans l'export

**Exemple :**

```bash
storycore memory-export --project ./my_project --output ./export --format zip --scope all
```

#### 2. `memory-validate`

Valide l'intégrité du système de mémoire et l'état du projet.

**Utilisation :**

```bash
storycore memory-validate --project <project_path> --scope <scope> --format <format> --strict --fix
```

**Options :**

- `--project` : Chemin vers le répertoire du projet à valider
- `--scope` : Portée de la validation (structure, config, memory, discussions, assets)
- `--format` : Format de sortie (human, json)
- `--strict` : Activer le mode de validation strict
- `--fix` : Tentative de correction automatique des problèmes de validation

**Exemple :**

```bash
storycore memory-validate --project ./my_project --scope all --format human --fix
```

#### 3. `memory-summary`

Génère des résumés de l'état du système de mémoire.

**Utilisation :**

```bash
storycore memory-summary --project <project_path> --type <type> --format <format> --limit <limit>
```

**Options :**

- `--project` : Chemin vers le répertoire du projet
- `--type` : Type de résumé à générer (overview, discussions, assets, memory, all)
- `--format` : Format de sortie (human, json, markdown)
- `--limit` : Limite du nombre d'éléments dans le résumé

**Exemple :**

```bash
storycore memory-summary --project ./my_project --type all --format markdown --limit 10
```

#### 4. `memory-recover`

Récupère le système de mémoire endommagé et l'état du projet.

**Utilisation :**

```bash
storycore memory-recover --project <project_path> --mode <mode> --format <format> --force
```

**Options :**

- `--project` : Chemin vers le répertoire du projet à récupérer
- `--mode` : Mode de récupération (automatic, desperate)
- `--format` : Format de sortie (human, json)
- `--force` : Forcer la récupération même si aucune erreur n'est détectée

**Exemple :**

```bash
storycore memory-recover --project ./my_project --mode automatic --format human
```

## Guide Développeur

### Architecture

Le système de mémoire LLM est structuré autour de plusieurs composants clés :

1. **MemorySystemCore** : Orchestrateur central qui coordonne toutes les opérations du système de mémoire.
2. **ConfigManager** : Gère la configuration du projet.
3. **DirectoryManager** : Gère la structure des répertoires.
4. **DiscussionManager** : Gère les discussions et les conversations.
5. **MemoryManager** : Gère la mémoire du projet.
6. **AssetManager** : Gère les actifs du projet.
7. **BuildLogger** : Journalise les actions et les événements.
8. **LogProcessor** : Traite les journaux de construction.
9. **ErrorDetector** : Détecte les erreurs dans le projet.
10. **RecoveryEngine** : Gère la récupération des erreurs.
11. **SummarizationEngine** : Génère des résumés.
12. **TimelineGenerator** : Génère une chronologie des événements.
13. **VariablesManager** : Gère les variables du projet.
14. **AutoQASystem** : Effectue des contrôles de qualité automatique.

### API

Le système de mémoire LLM offre une API complète pour interagir avec le système. Voici quelques-unes des principales méthodes :

#### Initialisation du Projet

```python
from memory_system import MemorySystemCore

memory_system = MemorySystemCore(project_path="./my_project")
memory_system.initialize_project(
    project_name="Mon Projet",
    project_type="video",
    objectives=["Créer une vidéo", "Ajouter des effets spéciaux"],
    enable_memory_system=True
)
```

#### Enregistrement des Discussions

```python
messages = [
    {"role": "user", "content": "Bonjour", "timestamp": "2026-01-26T16:31:35.288Z"},
    {"role": "assistant", "content": "Bonjour ! Comment puis-je vous aider ?", "timestamp": "2026-01-26T16:31:35.288Z"}
]

memory_system.record_discussion(messages)
```

#### Ajout d'un Actif

```python
memory_system.add_asset(
    asset_path="./assets/image.jpg",
    asset_type="image",
    description="Une belle image"
)
```

#### Mise à Jour de la Mémoire

```python
updates = {
    "objectives": [{"id": "1", "description": "Nouvel objectif"}],
    "entities": [{"id": "1", "name": "Nouvelle entité", "type": "personnage"}]
}

memory_system.update_memory(updates)
```

#### Validation du Projet

```python
validation_result = memory_system.validate_project_state()
print(f"Validation réussie : {validation_result.valid}")
```

#### Récupération du Projet

```python
from memory_system.data_models import RecoveryType

recovery_report = memory_system.trigger_recovery(RecoveryType.AUTOMATIC)
print(f"Récupération réussie : {recovery_report.success}")
```

### Stratégie de Test

Le système de mémoire LLM est testé de manière exhaustive pour garantir sa fiabilité et sa robustesse. Les tests sont organisés en plusieurs catégories :

1. **Tests Unitaires** : Testent les composants individuels du système.
2. **Tests de Propriétés** : Vérifient les propriétés du système.
3. **Tests d'Intégration** : Testent l'intégration des différents composants.
4. **Tests de Validation** : Valident le système dans son ensemble.

#### Exemple de Test Unitaire

```python
import unittest
from memory_system import MemorySystemCore

class TestMemorySystem(unittest.TestCase):
    def test_initialize_project(self):
        memory_system = MemorySystemCore(project_path="./test_project")
        result = memory_system.initialize_project(
            project_name="Test Project",
            project_type="video",
            objectives=["Test objective"],
            enable_memory_system=True
        )
        self.assertTrue(result)

if __name__ == "__main__":
    unittest.main()
```

#### Exemple de Test de Propriété

```python
from memory_system import MemorySystemCore

def test_memory_system_properties():
    memory_system = MemorySystemCore(project_path="./test_project")
    memory_system.initialize_project(
        project_name="Test Project",
        project_type="video",
        objectives=["Test objective"],
        enable_memory_system=True
    )
    
    # Vérifier que la mémoire est initialisée correctement
    memory = memory_system.memory_manager.load_memory()
    assert memory is not None
    assert memory.schema_version == "1.0"
```

## Conclusion

Le système de mémoire LLM de StoryCore Engine est un outil puissant pour la gestion des projets créatifs et techniques. Il offre une infrastructure robuste pour la gestion des données, des discussions, des actifs et des états de mémoire. Ce guide fournit une vue d'ensemble complète du système, y compris des instructions pour les utilisateurs et les développeurs.
