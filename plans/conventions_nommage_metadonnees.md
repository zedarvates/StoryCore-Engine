# Conventions de Nommage et Métadonnées pour StoryCore-Engine

## Conventions de Nommage

### 1. Dossiers
- **Format** : `snake_case` (minuscules avec des underscores)
- **Exemples** :
  - `shot_types`
  - `character_templates`
  - `video_engine`

### 2. Fichiers
- **Format** : `snake_case` (minuscules avec des underscores)
- **Exemples** :
  - `scifi.json`
  - `close_up.json`
  - `story_engine.py`

### 3. Modules
- **Format** : `snake_case` (minuscules avec des underscores)
- **Exemples** :
  - `video_engine`
  - `analytics_dashboard`

### 4. Variables et Fonctions
- **Format** : `snake_case` pour les variables et fonctions
- **Exemples** :
  - `generate_prompt()`
  - `story_model`

### 5. Classes
- **Format** : `PascalCase` (majuscules pour chaque mot)
- **Exemples** :
  - `StoryEngine`
  - `PromptService`

## Métadonnées Standardisées

### 1. Structure des Métadonnées pour les Prompts

Chaque fichier JSON dans le dossier `prompts/` devra inclure les métadonnées suivantes :

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

### 2. Structure des Métadonnées pour les Templates

Chaque fichier JSON dans le dossier `templates/` devra inclure les métadonnées suivantes :

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

### 3. Structure des Métadonnées pour les Modules

Chaque module devra inclure un fichier `metadata.json` avec les informations suivantes :

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

## Exemples de Fichiers avec Métadonnées

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

## Bonnes Pratiques

1. **Cohérence** : Respectez les conventions de nommage et les structures de métadonnées pour assurer la cohérence du projet.

2. **Documentation** : Documentez chaque fichier et module avec des métadonnées complètes pour faciliter la recherche et la maintenance.

3. **Mises à Jour** : Mettez à jour les métadonnées à chaque modification pour assurer leur exactitude.

4. **Validation** : Utilisez des outils de validation pour vérifier la conformité des métadonnées et des conventions de nommage.

## Prochaines Étapes

1. **Créer un plan détaillé de la nouvelle structure** : Détailler chaque dossier, sous-dossier et fichier principal.

2. **Valider le plan avec l'utilisateur** : Obtenir l'approbation de l'utilisateur avant de procéder à l'implémentation.