# Guide Utilisateur - World Builder Wizard

## Vue d'ensemble

Le World Builder Wizard est votre assistant ultime pour créer des univers narratifs cohérents et immersifs. Que vous écriviez un roman fantasy épique, un scénario de film de science-fiction, ou développiez un jeu vidéo, le World Builder vous aide à construire un monde qui captivera votre audience.

> **💡 Astuce** : Commencez toujours par définir votre genre et type de monde - cela influence automatiquement tous les autres aspects.

## Démarrage Rapide

### 5 Minutes pour Votre Premier Monde

1. **Lancez le wizard** : Via StoryCore Assistant ("Create a new world") ou CLI (`storycore world-wizard`)

2. **Choisissez le genre** :
   ```
   Genre: Fantasy
   Type: High Fantasy
   ```

3. **Laissez la magie opérer** ✨

4. **Résultat** : Un monde complet avec géographie, culture, atmosphère, et identité visuelle

### Exemple de Session Complète

```
🌍 World Builder Wizard
Genre sélectionné: Fantasy
Type de monde: High Fantasy

🔍 Analyse des contraintes...
✅ Templates chargés
✅ Paramètres validés

🏗️ Construction du monde...
├── Génération géographie
├── Développement culturel
├── Création atmosphère
└── Définition identité visuelle

💾 Sauvegarde...
✅ Monde sauvegardé: world_fantasy_epic_001.json

🎉 Monde "Elyndor Realm" créé avec succès!
```

## Interfaces Disponibles

### 1. Interface Graphique (Recommandée)

#### Via StoryCore Assistant
- Tapez "Create a new world" ou "Extract world from text"
- Interface conversationnelle guidée
- Prévisualisation en temps réel
- Suggestions contextuelles

#### Via Wizard Launcher
- Menu Wizards → World Building
- Options pré-configurées
- Aperçu avant génération
- Export automatique

### 2. Interface Ligne de Commande

#### Commandes de Base
```bash
# Génération interactive
storycore world-wizard

# Avec paramètres directs
storycore world-wizard --genre sci_fi --world-type cyberpunk

# Extraction depuis texte
storycore world-wizard --extract-from my_story.txt
```

#### Options Avancées
```bash
# Contrôle complet
storycore world-wizard \
  --genre fantasy \
  --world-type high_fantasy \
  --scale large \
  --technology-level medieval_magic \
  --atmosphere mysterious_epic \
  --export-visual-identity \
  --validate-consistency
```

## Création d'un Nouveau Monde

### Étape 1: Choix du Genre et Type

Le choix du genre détermine les templates et contraintes appliquées automatiquement.

#### Genres Disponibles

| Genre | Description | Types Disponibles |
|-------|-------------|-------------------|
| **Fantasy** | Mondes avec magie et créatures | High Fantasy, Dark Fantasy, Urban Fantasy |
| **Sci-Fi** | Futur technologique | Hard Sci-Fi, Space Opera, Cyberpunk, Post-Apocalyptic |
| **Horror** | Terreur et surnaturel | Modern Horror, Cosmic Horror, Psychological |
| **Historical** | Périodes historiques | Ancient, Medieval, Renaissance, Industrial |
| **Superhero** | Pouvoirs surhumains | Classic Superhero, Dark Superhero, Street Level |

#### Types de Monde Détaillés

##### Fantasy High Fantasy
- **Magie** : Présente partout, systématisée
- **Société** : Royaumes féodaux, guildes magiques
- **Technologie** : Médiévale avec enchantements
- **Exemples** : Terre du Milieu, Forgotten Realms

##### Sci-Fi Cyberpunk
- **Magie** : Aucune (technologie pure)
- **Société** : Mega-corporations, hackers, rue
- **Technologie** : Haute tech, implants, IA
- **Exemples** : Blade Runner, Cyberpunk 2077

##### Horror Modern
- **Magie** : Surnaturelle subtile
- **Société** : Monde normal avec menaces cachées
- **Technologie** : Contemporaine avec éléments étranges
- **Exemples** : The Shining, Hereditary

### Étape 2: Paramètres de Génération

#### Échelle du Monde
- **Small** : Village/island (1-2 sociétés, 3-5 features)
- **Medium** : Région/continent (3-5 sociétés, 5-10 features)
- **Large** : Monde entier (5+ sociétés, 10+ features)

#### Niveau Technologique
- **Primitive** : Chasse/cueillette, outils de base
- **Medieval** : Agriculture, chevalerie, artisanat
- **Renaissance** : Imprimerie, navigation, premières sciences
- **Industrial** : Machines à vapeur, révolution industrielle
- **Modern** : Électricité, ordinateurs, internet
- **Future** : IA, espace, nanotechnologie

#### Ambiance Atmosphérique
- **Mysterious_Epic** : Aventure et découverte
- **Tense_Frightening** : Suspense et danger
- **Peaceful_Harmonious** : Sérénité et équilibre
- **Chaotic_Dynamic** : Changement constant
- **Melancholic_Beautiful** : Nostalgie et élégance

### Étape 3: Génération et Validation

#### Processus Automatique
1. **Analyse** : Validation des paramètres
2. **Géographie** : Génération terrain, climat, features
3. **Culture** : Développement sociétés, coutumes, valeurs
4. **Atmosphère** : Création mood, détails sensoriels
5. **Visuel** : Définition palette, architecture, motifs
6. **Validation** : Cohérence interne et recommandations

#### Métriques de Qualité
- **Confidence Score** : Fiabilité globale (0-100%)
- **Consistency** : Cohérence interne des éléments
- **Completeness** : Couverture des aspects importants
- **Originality** : Équilibre conventions/originalité

### Étape 4: Résultats et Exports

#### Fichiers Générés
```
project/
├── world_fantasy_epic_001.json     # Données complètes monde
├── world_visual_identity.json      # Identité visuelle détaillée
├── world_validation_report.json    # Rapport qualité
└── world_assets/                   # Assets exportés (si demandé)
    ├── color_palette.png
    ├── architectural_examples.jpg
    └── mood_board.pdf
```

#### Formats d'Export
- **JSON** : Données structurées complètes
- **Markdown** : Documentation lisible humain
- **PDF** : Rapport présentation
- **CSV** : Données tabulaires pour analyse

## Extraction depuis Texte Existante

### Sources Supportées

#### Types de Documents
- **Romans/Nouvelles** : Extraction personnages, monde, plot
- **Scénarios** : Focus dialogues, scènes, atmosphère
- **Lore/Background** : Documents world-building dédiés
- **Notes d'écriture** : Idées éparses, concepts
- **Articles/Recherche** : Documents informatifs

#### Formats de Fichiers
- `.txt` - Texte brut
- `.md` - Markdown
- `.story` - Format StoryCore
- `.novel` - Romans structurés
- `.doc/.docx` - Documents Word

### Processus d'Extraction

#### Étape 1: Préparation du Texte
- **Nettoyage** : Suppression métadonnées, formatage
- **Structuration** : Chapitres, sections claires
- **Enrichissement** : Ajout contexte si nécessaire

#### Étape 2: Analyse Automatique
```
🤖 Roger Wizard - Data Extraction Assistant

📄 Analyzing file: my_fantasy_novel.txt
📊 Text length: 45,231 characters

🎯 Estimated Extractions:
    Characters: ~12
    Locations: ~8
    World Elements: ~15

⏳ Starting intelligent extraction...
├── Extraction personnages
├── Analyse localisations
├── Identification éléments monde
└── Génération résumé
```

#### Étape 3: Validation et Enrichissement
- **Review humain** : Vérification extractions
- **Corrections** : Ajustements nécessaires
- **Enrichissement LLM** : Détails additionnels cohérents
- **Fusion** : Intégration données existantes

### Métriques d'Extraction

#### Scores de Confiance
- **Overall** : Fiabilité globale (0-100%)
- **Characters** : Précision extraction personnages
- **Locations** : Qualité identification lieux
- **World Elements** : Pertinence éléments monde

#### Métriques Détaillées
- **Coverage** : % texte analysé utile
- **Accuracy** : Précision identifications
- **Completeness** : Couverture aspects monde
- **Consistency** : Cohérence extractions

### Exemple d'Extraction

#### Texte Source
```
In the shadowed valleys of Eldoria, where crystal spires pierced the eternal mist,
the elf-lord Elandor ruled from his floating citadel. The ancient magic flowed
through ley lines of pure diamond, powering the great forges where star-metal
was crafted into legendary blades.
```

#### Résultat Extraction
```json
{
  "locations": [
    {
      "name": "Eldoria Valleys",
      "type": "geographical_region",
      "description": "Shadowed valleys with crystal formations",
      "atmosphere": "mysterious_ancient"
    },
    {
      "name": "Floating Citadel",
      "type": "structure",
      "description": "Elf lord's residence above the mist",
      "significance": "political_center"
    }
  ],
  "world_elements": [
    {
      "category": "magic_system",
      "name": "Crystal Ley Lines",
      "description": "Magical energy conduits made of diamond",
      "properties": ["power_source", "geographical"]
    },
    {
      "category": "technology",
      "name": "Star-Metal Forges",
      "description": "Magical forges crafting legendary weapons",
      "materials": ["star_metal", "crystal_energy"]
    }
  ]
}
```

## Modification de Mondes Existants

### Chargement et Édition

#### Via Interface Graphique
1. **Sélection monde** dans liste projets
2. **Ouvrir éditeur** world builder
3. **Modifier paramètres** souhaités
4. **Re-génération** avec nouvelles contraintes

#### Via Ligne de Commande
```bash
# Charger monde existant
storycore world-wizard --load world_fantasy_epic_001.json

# Modifier et regénérer
storycore world-wizard --merge-with existing_world.json --update-atmosphere

# Fusionner mondes
storycore world-wizard --merge world1.json world2.json --resolve-conflicts
```

### Stratégies de Modification

#### Extension
- Ajouter nouvelles régions géographiques
- Introduire nouvelles sociétés culturelles
- Développer éléments lore existants

#### Refactoring
- Changer niveau technologique global
- Ajuster atmosphère générale
- Rééquilibrer éléments pour cohérence

#### Spécialisation
- Focus sur région spécifique
- Développement société particulière
- Exploration élément monde détaillé

### Gestion de Versions

#### Sauvegarde Automatique
- Versions horodatées automatiquement
- Métadonnées changement conservées
- Rollback possible

#### Comparaison
```json
{
  "version_comparison": {
    "v1.0": {
      "societies_count": 3,
      "atmosphere": "mysterious_epic"
    },
    "v1.1": {
      "societies_count": 5,
      "atmosphere": "mysterious_epic",
      "changes": ["Added dwarven clans", "Expanded geography"]
    }
  }
}
```

## Intégration avec autres Wizards

### Workflow Recommandé

#### 1. World Builder → Character Wizard
```typescript
// Création personnages cohérents avec monde
const world = await worldBuilder.loadWorld(worldId);
const characters = await characterWizard.generateCharacters({
  count: 5,
  worldContext: world,
  requiredRoles: ['protagonist', 'antagonist', 'mentor']
});
```

#### 2. World Builder → Shot Planning
```typescript
// Plans caméra adaptés au monde visuel
const visualIdentity = world.visual_identity;
const shots = await shotPlanner.generateShots({
  scene: sceneDescription,
  visualStyle: visualIdentity,
  atmosphericConditions: world.atmosphere.mood
});
```

#### 3. World Builder → Dialogue Wizard
```typescript
// Dialogues culturellement adaptés
const culturalElements = world.culture;
const dialogue = await dialogueWizard.generateDialogue({
  characters: characterList,
  context: sceneContext,
  culturalAdaptation: culturalElements,
  tone: world.atmosphere.mood
});
```

### Chaînage Automatique

#### Via StoryCore Assistant
```
User: "Create a fantasy world and characters for my story"

Assistant: 🔍 Analyzing request...
          📋 Detected: World + Character creation

Response: "I'll create a complete fantasy world first, then generate characters that fit perfectly. Let's start with the world building..."

[World Builder launched automatically]
[Character Wizard queued for next step]
```

#### Workflows Pré-définis

##### "Nouveau Projet Complet"
1. World Builder (genre + type)
2. Character Wizard (rôles principaux)
3. Shot Planning (scènes clés)
4. Dialogue Wizard (scènes pivots)

##### "Extension Monde Existante"
1. World Builder (chargement + extension)
2. Character Wizard (nouveaux personnages)
3. Shot Planning (nouvelles scènes)

##### "Remastering Projet"
1. World Builder (analyse cohérence)
2. Character Wizard (approfondissement)
3. Shot Planning (optimisation visuelle)

## Dépannage

### Problèmes Courants

#### "World generation failed: invalid genre"
**Cause** : Genre spécifié non supporté ou mal orthographié
**Solution** :
```bash
# Lister genres disponibles
storycore world-wizard --list-genres

# Utiliser orthographe exacte
storycore world-wizard --genre "science_fiction"
```

#### "LLM service timeout during enhancement"
**Cause** : Modèle LLM lent ou surcharge réseau
**Solution** :
- Désactiver enhancement: `--no-llm-enhance`
- Changer modèle dans settings
- Réessayer plus tard

#### "Persistence failed: all layers unavailable"
**Cause** : Problèmes permissions ou espace disque
**Solution** :
- Vérifier droits écriture dossier projet
- Libérer espace disque
- Utiliser localStorage uniquement: `--persistence localStorage`

#### "Extraction confidence too low"
**Cause** : Texte source court ou ambigu
**Solution** :
- Fournir texte plus long (>1000 mots)
- Ajouter contexte explicite
- Diviser en fichiers thématiques

### Diagnostics

#### Commandes de Debug
```bash
# Vérifier configuration LLM
storycore world-wizard --check-llm

# Tester génération simple
storycore world-wizard --test-generation

# Valider fichier monde
storycore world-wizard --validate world.json

# Montrer logs détaillés
storycore world-wizard --verbose
```

#### Logs et Rapports

##### Fichiers de Debug
```
project/
├── world_builder_debug.log    # Logs détaillés
├── generation_report.json     # Rapport génération
├── extraction_metrics.json    # Métriques extraction
└── validation_results.json    # Résultats validation
```

##### Analyse Performance
```json
{
  "performance_metrics": {
    "total_time": "15.7s",
    "llm_calls": 3,
    "tokens_used": 2450,
    "memory_peak": "234MB",
    "generation_steps": [
      {"step": "geography", "time": "2.1s"},
      {"step": "culture", "time": "3.8s"},
      {"step": "atmosphere", "time": "1.9s"},
      {"step": "visual_identity", "time": "4.2s"},
      {"step": "validation", "time": "0.7s"}
    ]
  }
}
```

## Bonnes Pratiques

### Organisation Projet

#### Structure Recommandée
```
my_story_project/
├── worlds/                    # Mondes créés
│   ├── world_main.json
│   ├── world_expansion.json
│   └── world_alternate.json
├── characters/               # Personnages liés
├── shots/                    # Plans adaptés
├── dialogues/               # Dialogues monde
└── assets/                  # Visuels monde
    ├── maps/
    ├── color_palettes/
    └── mood_boards/
```

#### Nommage Cohérent
- `world_{genre}_{type}_{id}.json`
- `world_{aspect}_expansion.json`
- `character_{world}_{role}.json`

### Optimisation Performance

#### Pour Grands Mondes
- Utiliser `--scale medium` plutôt que `large`
- Désactiver LLM enhancement pour itérations rapides
- Générer éléments par parties

#### Cache et Reuse
- Réutiliser mondes similaires comme templates
- Extraire patterns réussis pour nouveaux projets
- Maintenir bibliothèque mondes personnels

### Qualité et Cohérence

#### Reviews Régulières
- Valider cohérence après changements majeurs
- Tester intégration avec autres éléments story
- Vérifier immersion auprès beta readers

#### Documentation
- Commenter décisions world-building importantes
- Tenir changelog des modifications monde
- Documenter contraintes et règles établies

## Exemples Avancés

### Monde Fantasy Épique avec Extension

#### Génération Initiale
```bash
storycore world-wizard \
  --genre fantasy \
  --world-type high_fantasy \
  --scale large \
  --atmosphere mysterious_epic \
  --export-visual-identity \
  --export-detailed
```

#### Extension Régionale
```bash
storycore world-wizard \
  --load world_fantasy_epic_001.json \
  --add-region "Northern Wastes" \
  --add-culture "Ice Nomads" \
  --update-atmosphere \
  --validate-consistency
```

### Monde Cyberpunk Urbain

#### Configuration Spécialisée
```bash
storycore world-wizard \
  --genre sci_fi \
  --world-type cyberpunk \
  --technology-level high_tech \
  --societal-focus corporate_dystopia \
  --atmosphere neon_dystopian \
  --color-theme cyber_blue_neon
```

#### Intégration Character
```bash
# Générer personnages adaptés
storycore character-wizard \
  --world world_cyberpunk_001.json \
  --archetypes "hacker,corporate_exec,street_samurai" \
  --cultural-adaptation corporate_dystopia
```

### Extraction et Fusion Multi-Sources

#### Sources Multiples
```bash
# Extraire de plusieurs documents
storycore world-wizard \
  --extract-from novel_chapter1.txt novel_chapter2.txt world_lore.md \
  --merge-strategy intelligent \
  --resolve-conflicts interactive \
  --confidence-threshold 0.8
```

#### Post-Traitement
```bash
# Validation et amélioration
storycore world-wizard \
  --load extracted_world.json \
  --llm-enhance \
  --validate-consistency \
  --generate-visual-assets
```

## Support et Ressources

### Obtenir de l'Aide

#### Documentation
- [API Reference](world-builder-api.md) - Référence technique complète
- [Troubleshooting Guide](world-builder-troubleshooting.md) - Solutions problèmes courants
- [Best Practices](world-builder-best-practices.md) - Guides optimisation

#### Communauté
- **Forum StoryCore** : Partage mondes et conseils
- **Discord** : Support temps réel
- **GitHub Issues** : Bugs et feature requests

### Templates et Exemples

#### Templates Disponibles
- `fantasy_high_fantasy` - Monde heroic fantasy complet
- `sci_fi_cyberpunk` - Métropole futuriste
- `horror_modern` - Terreur contemporaine
- `superhero_metropolis` - Ville superhéros

#### Monde Exemple - Elyndor Realm

```json
{
  "world_id": "world_fantasy_epic_001",
  "name": "Elyndor Realm",
  "genre": "fantasy",
  "type": "high_fantasy",
  "description": "A vast realm where ancient magic flows through crystal formations, inhabited by diverse races united against growing darkness.",

  "key_features": [
    "Crystal-powered magic system",
    "Multi-racial society with ancient alliances",
    "Threat of magical depletion",
    "Floating citadels and underground dwarven forges"
  ],

  "visual_palette": [
    "#4A90E2", "#7ED321", "#F5A623", "#BD10E0", "#50E3C2"
  ]
}
```

Ce guide couvre l'utilisation complète du World Builder Wizard. Pour des cas d'usage spécifiques ou des problèmes particuliers, consultez la documentation API ou contactez le support.