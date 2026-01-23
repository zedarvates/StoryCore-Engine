# Nouvelle Hiérarchie Logique et Scalable pour StoryCore-Engine

## Analyse de la Structure Actuelle

La structure actuelle du projet StoryCore-Engine présente plusieurs points faibles :

1. **Manque de cohérence dans l'organisation des fichiers** : Les fichiers sont répartis de manière disparate dans des dossiers comme `assets/`, `Commandes/`, `scripts/`, etc., sans une logique claire.

2. **Absence de métadonnées standardisées** : Les fichiers ne sont pas accompagnés de métadonnées structurées, ce qui rend la recherche et la gestion des ressources inefficaces.

3. **Hiérarchie peu intuitive** : Les dossiers comme `assets/13-universe-types/` ou `assets/01-master-coherence/` ne suivent pas une convention de nommage cohérente ou une logique scalable.

4. **Manque de modularité** : Les composants ne sont pas clairement séparés, ce qui rend difficile la maintenance et l'évolution du projet.

## Nouvelle Hiérarchie Proposée

La nouvelle hiérarchie est conçue pour être intuitive, scalable et optimisée pour une recherche efficace par les LLM. Elle suit les principes de modularité, de séparation des préoccupations et de gestion des métadonnées.

```
storycore-engine/
│
├── core/
│   ├── engine/
│   │   ├── story_engine.py
│   │   ├── prompt_engine.py
│   │   └── ...
│   ├── models/
│   │   ├── story_model.py
│   │   ├── character_model.py
│   │   └── ...
│   └── services/
│       ├── prompt_service.py
│       ├── generation_service.py
│       └── ...
│
├── assets/
│   ├── prompts/
│   │   ├── genres/
│   │   │   ├── scifi.json
│   │   │   ├── fantasy.json
│   │   │   └── ...
│   │   ├── shot_types/
│   │   │   ├── close_up.json
│   │   │   ├── wide_shot.json
│   │   │   └── ...
│   │   └── ...
│   ├── templates/
│   │   ├── character_templates/
│   │   │   ├── hero.json
│   │   │   ├── villain.json
│   │   │   └── ...
│   │   └── scene_templates/
│   │       ├── interior.json
│   │       ├── exterior.json
│   │       └── ...
│   └── metadata/
│       ├── prompts_metadata.json
│       ├── templates_metadata.json
│       └── ...
│
├── modules/
│   ├── video_engine/
│   │   ├── advanced_video_features.py
│   │   ├── optimize_video_engine.py
│   │   └── ...
│   ├── analytics/
│   │   ├── analytics_dashboard.html
│   │   └── ...
│   └── ...
│
├── scripts/
│   ├── automation/
│   │   ├── autofix_engine.py
│   │   ├── rollback_migration.py
│   │   └── ...
│   ├── tests/
│   │   ├── test_wizard_e2e.py
│   │   ├── run_comprehensive_tests.py
│   │   └── ...
│   └── ...
│
├── config/
│   ├── default_config.json
│   ├── production_config.json
│   └── ...
│
├── docs/
│   ├── README.md
│   ├── ROADMAP.md
│   ├── STRUCTURE.md
│   └── ...
│
└── tests/
    ├── unit/
    │   ├── test_story_engine.py
    │   └── ...
    ├── integration/
    │   ├── test_integration.py
    │   └── ...
    └── ...
```

## Conventions de Nommage et Métadonnées

### Conventions de Nommage

1. **Dossiers** : Utilisation de `snake_case` pour les noms de dossiers (ex: `shot_types`, `character_templates`).

2. **Fichiers** : Utilisation de `snake_case` pour les noms de fichiers (ex: `scifi.json`, `close_up.json`).

3. **Modules** : Utilisation de `snake_case` pour les noms de modules (ex: `video_engine`, `analytics`).

### Métadonnées Standardisées

Chaque fichier JSON dans les dossiers `prompts/` et `templates/` devra inclure les métadonnées suivantes :

```json
{
  "id": "unique_identifier",
  "name": "Display Name",
  "description": "Brief description of the prompt/template",
  "category": "genres|shot_types|templates",
  "subcategory": "scifi|close_up|character",
  "tags": ["tag1", "tag2", "tag3"],
  "version": "1.0.0",
  "created_at": "2026-01-22",
  "updated_at": "2026-01-22",
  "author": "author_name",
  "usage": "When and how to use this prompt/template",
  "examples": [
    {
      "input": "Example input",
      "output": "Example output"
    }
  ]
}
```

## Avantages de la Nouvelle Hiérarchie

1. **Recherche Efficace** : Les métadonnées standardisées permettent une recherche rapide et précise par les LLM.

2. **Scalabilité** : La structure modulaire permet d'ajouter facilement de nouveaux composants sans perturber l'existant.

3. **Maintenabilité** : La séparation claire des préoccupations facilite la maintenance et les mises à jour.

4. **Intuitivité** : Les conventions de nommage et l'organisation logique rendent la structure facile à comprendre et à naviguer.

## Prochaines Étapes

1. **Définir les conventions de nommage et les métadonnées** : Finaliser les détails des métadonnées et des conventions de nommage.

2. **Créer un plan détaillé de la nouvelle structure** : Détailler chaque dossier, sous-dossier et fichier principal.

3. **Valider le plan avec l'utilisateur** : Obtenir l'approbation de l'utilisateur avant de procéder à l'implémentation.

## Diagramme de la Nouvelle Hiérarchie

```mermaid
graph TD
    A[storycore-engine] --> B[core]
    A --> C[assets]
    A --> D[modules]
    A --> E[scripts]
    A --> F[config]
    A --> G[docs]
    A --> H[tests]
    
    B --> B1[engine]
    B --> B2[models]
    B --> B3[services]
    
    C --> C1[prompts]
    C --> C2[templates]
    C --> C3[metadata]
    
    C1 --> C1a[genres]
    C1 --> C1b[shot_types]
    
    C2 --> C2a[character_templates]
    C2 --> C2b[scene_templates]
    
    D --> D1[video_engine]
    D --> D2[analytics]
    
    E --> E1[automation]
    E --> E2[tests]
    
    H --> H1[unit]
    H --> H2[integration]