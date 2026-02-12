# Documentation de la Structure du Projet StoryCore-Engine

## Introduction
Ce document fournit une documentation complète de la nouvelle structure du projet StoryCore-Engine, des conventions de nommage adoptées, des métadonnées utilisées, ainsi que des exemples pratiques pour illustrer ces conventions. Il inclut également un guide pour maintenir et étendre la structure à l'avenir.

---

## 1. Description de la Nouvelle Hiérarchie des Fichiers et Dossiers

La nouvelle hiérarchie du projet StoryCore-Engine est conçue pour être intuitive, scalable et optimisée pour une recherche efficace par les systèmes d'IA. Elle suit les principes de modularité, de séparation des préoccupations et de gestion des métadonnées.

### Structure Globale

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

### Description des Dossiers Principaux

1. **core/** : Contient le cœur du moteur de StoryCore, y compris les moteurs, modèles et services.
   - **engine/** : Moteurs principaux pour la génération de contenu.
   - **models/** : Modèles de données et structures.
   - **services/** : Services pour la gestion des prompts et la génération de contenu.

2. **assets/** : Contient les ressources utilisées par le projet, organisées en sous-dossiers.
   - **prompts/** : Prompts pour la génération de contenu, organisés par catégories.
   - **templates/** : Modèles pour les personnages, scènes, etc.
   - **metadata/** : Métadonnées pour les prompts et templates.

3. **modules/** : Contient les modules fonctionnels du projet.
   - **video_engine/** : Moteur pour la gestion et l'optimisation des vidéos.
   - **analytics/** : Outils pour l'analyse des données.

4. **scripts/** : Contient les scripts pour l'automatisation et les tests.
   - **automation/** : Scripts pour l'automatisation des tâches.
   - **tests/** : Scripts pour les tests end-to-end et les tests unitaires.

5. **config/** : Contient les fichiers de configuration pour différents environnements.

6. **docs/** : Contient la documentation du projet.

7. **tests/** : Contient les tests unitaires et d'intégration.

---

## 2. Conventions de Nommage

### Dossiers
- **Format** : `snake_case` (minuscules avec des underscores)
- **Exemples** :
  - `shot_types`
  - `character_templates`
  - `video_engine`

### Fichiers
- **Format** : `snake_case` (minuscules avec des underscores)
- **Exemples** :
  - `scifi.json`
  - `close_up.json`
  - `story_engine.py`

### Modules
- **Format** : `snake_case` (minuscules avec des underscores)
- **Exemples** :
  - `video_engine`
  - `analytics_dashboard`

### Variables et Fonctions
- **Format** : `snake_case` pour les variables et fonctions
- **Exemples** :
  - `generate_prompt()`
  - `story_model`

### Classes
- **Format** : `PascalCase` (majuscules pour chaque mot)
- **Exemples** :
  - `StoryEngine`
  - `PromptService`

---

## 3. Métadonnées Utilisées et Leur Structure

### Structure des Métadonnées pour les Prompts

Chaque fichier JSON dans le dossier `prompts/` doit inclure les métadonnées suivantes :

```json
{
  "id": "unique_identifier",
  "name": "Display Name",
  "description": "Brief description of the prompt",
  "category": "genres|shot_types|lighting|scene_elements",
  "subcategory": "scifi|close_up|golden_hour|hero_character",
  "tags": ["tag1", "tag2", "tag3"],
  "version": "1.0.0",
  "created_at": "2026-01-22",
  "updated_at": "2026-01-22",
  "author": "author_name",
  "usage": "When and how to use this prompt",
  "examples": [
    {
      "input": "Example input",
      "output": "Example output"
    }
  ],
  "variables": {
    "VARIABLE_NAME": {
      "type": "string|number|boolean|enum",
      "required": true|false,
      "default": "default_value",
      "description": "Description of the variable"
    }
  }
}
```

### Structure des Métadonnées pour les Templates

Chaque fichier JSON dans le dossier `templates/` doit inclure les métadonnées suivantes :

```json
{
  "id": "unique_identifier",
  "name": "Display Name",
  "description": "Brief description of the template",
  "category": "character_templates|scene_templates|dialogue_templates",
  "subcategory": "hero|villain|interior|exterior",
  "tags": ["tag1", "tag2", "tag3"],
  "version": "1.0.0",
  "created_at": "2026-01-22",
  "updated_at": "2026-01-22",
  "author": "author_name",
  "usage": "When and how to use this template",
  "examples": [
    {
      "input": "Example input",
      "output": "Example output"
    }
  ],
  "fields": {
    "FIELD_NAME": {
      "type": "string|number|boolean|enum",
      "required": true|false,
      "default": "default_value",
      "description": "Description of the field"
    }
  }
}
```

### Structure des Métadonnées pour les Modules

Chaque module doit inclure un fichier `metadata.json` avec les informations suivantes :

```json
{
  "id": "module_identifier",
  "name": "Module Name",
  "description": "Brief description of the module",
  "version": "1.0.0",
  "created_at": "2026-01-22",
  "updated_at": "2026-01-22",
  "author": "author_name",
  "dependencies": ["dependency1", "dependency2"],
  "usage": "How to use this module"
}
```

---

## 4. Exemples Pratiques

### Exemple de Prompt (scifi.json)

```json
{
  "id": "prompt-scifi-001",
  "name": "Science Fiction Scene",
  "description": "A prompt for generating science fiction scenes",
  "category": "genres",
  "subcategory": "scifi",
  "tags": ["scifi", "futuristic", "space"],
  "version": "1.0.0",
  "created_at": "2026-01-22",
  "updated_at": "2026-01-22",
  "author": "StoryCore Team",
  "usage": "Use this prompt to generate detailed science fiction scenes",
  "examples": [
    {
      "input": "A spaceship landing on a distant planet",
      "output": "The spaceship descended slowly, its engines glowing against the dark sky of the alien planet."
    }
  ],
  "variables": {
    "SETTING": {
      "type": "string",
      "required": true,
      "default": "space station",
      "description": "The setting of the scene"
    },
    "CHARACTER": {
      "type": "string",
      "required": false,
      "default": "astronaut",
      "description": "The main character in the scene"
    }
  }
}
```

### Exemple de Template (hero.json)

```json
{
  "id": "template-hero-001",
  "name": "Hero Character Template",
  "description": "A template for creating hero characters",
  "category": "character_templates",
  "subcategory": "hero",
  "tags": ["character", "hero", "protagonist"],
  "version": "1.0.0",
  "created_at": "2026-01-22",
  "updated_at": "2026-01-22",
  "author": "StoryCore Team",
  "usage": "Use this template to create detailed hero characters for your stories",
  "examples": [
    {
      "input": "A brave knight with a magical sword",
      "output": "Sir Aldric, a brave knight with a magical sword, ready to defend the kingdom."
    }
  ],
  "fields": {
    "NAME": {
      "type": "string",
      "required": true,
      "default": "Hero",
      "description": "The name of the hero"
    },
    "WEAPON": {
      "type": "string",
      "required": false,
      "default": "sword",
      "description": "The weapon of the hero"
    }
  }
}
```

---

## 5. Guide pour Maintenir et Étendre la Structure

### Bonnes Pratiques

1. **Cohérence** : Respectez les conventions de nommage et les structures de métadonnées pour assurer la cohérence du projet.

2. **Documentation** : Documentez chaque fichier et module avec des métadonnées complètes pour faciliter la recherche et la maintenance.

3. **Mises à Jour** : Mettez à jour les métadonnées à chaque modification pour assurer leur exactitude.

4. **Validation** : Utilisez des outils de validation pour vérifier la conformité des métadonnées et des conventions de nommage.

### Étendre la Structure

Pour ajouter de nouveaux composants ou modules :

1. **Créer un Nouveau Dossier** : Suivez les conventions de nommage pour les dossiers (`snake_case`).

2. **Ajouter des Fichiers** : Utilisez les conventions de nommage pour les fichiers (`snake_case`).

3. **Ajouter des Métadonnées** : Assurez-vous que chaque fichier ou module inclut les métadonnées appropriées.

4. **Documenter** : Ajoutez une documentation claire pour le nouveau composant ou module.

5. **Valider** : Utilisez des outils de validation pour vérifier la conformité des nouvelles additions.

---

## Conclusion

Cette documentation fournit une vue d'ensemble complète de la nouvelle structure du projet StoryCore-Engine, des conventions de nommage adoptées, des métadonnées utilisées, ainsi que des exemples pratiques pour illustrer ces conventions. En suivant ce guide, vous pouvez maintenir et étendre la structure de manière cohérente et efficace.
