# Content Sensitivity Addon

Un addon complet de détection de sensibilité culturelle pour StoryCore avec support PEGI et jauge woke/anti-woke.

## Fonctionnalités

### 1. Détection de Sensibilité Culturelle
- **Analyse de dialogue** : Détection automatique de mots-clés sensibles (religion, racisme, xénophobie)
- **Analyse vestimentaire** : Vérification du contexte culturel des vêtements
- **Analyse de scénario** : Détection de conflits culturels, religieux et politiques

### 2. Système de Scoring PEGI
- **PEGI 3** : Score ≤ 30 - Convient à tous les âges
- **PEGI 7** : Score ≤ 60 - Scènes légèrement effrayantes
- **PEGI 12** : Score ≤ 80 - Violence modérée, langage modéré
- **PEGI 16** : Score ≤ 90 - Violence réaliste, langage grossier
- **PEGI 18** : Score ≤ 100 - Violence extrême, thèmes adultes

### 3. Indicateurs de Contenu
Le système détecte automatiquement les pictogrammes PEGI :
- Violence
- Langage grossier
- Peur
- Drogues
- Sexe
- Discrimination
- Jeux de hasard
- Achats intégrés
- Interactions en ligne

### 4. Jauge Woke/Anti-Woke
Nouvelle fonctionnalité de détection d'idéologie :
- **Analyse woke** : Détecte les termes liés à la diversité, inclusion, équité, justice sociale
- **Analyse anti-woke** : Détecte les termes conservateurs, libertariens, traditionnels
- **Score équilibré** : Combine les deux analyses pour un score neutre
- **Visualisation** : Jauge colorée (vert/jaune/rouge) selon le niveau d'idéologie

### 5. Mécanismes d'Auto-Censure
- Remplacement automatique de mots sensibles
- Suggestions de changement de vêtements
- Pixelation d'images (future extension)
- Alertes configurables

## Installation

1. Copier le dossier `content_sensitivity` dans `addons/`
2. Vérifier les dépendances : `perspective-api-client`
3. Configurer la clé API Perspective dans `config.json`
4. L'addon sera automatiquement chargé au démarrage

## Configuration

### Fichier de configuration : `config/schema.json`

```json
{
  "sensitivity_levels": {
    "low": {"threshold": 30, "actions": ["log", "suggest_review"]},
    "medium": {"threshold": 60, "actions": ["log", "suggest_review", "auto_censor"]},
    "high": {"threshold": 80, "actions": ["log", "suggest_review", "auto_censor", "alert_user"]}
  },
  "pegi_ratings": {
    "PEGI 3": {"threshold": 30},
    "PEGI 7": {"threshold": 60},
    "PEGI 12": {"threshold": 80},
    "PEGI 16": {"threshold": 90},
    "PEGI 18": {"threshold": 100}
  },
  "content_indicators": {
    "violence": {"threshold": 20},
    "language": {"threshold": 15},
    "fear": {"threshold": 10},
    "drugs": {"threshold": 25},
    "sex": {"threshold": 30},
    "discrimination": {"threshold": 35}
  }
}
```

## Utilisation

### API de Base

```javascript
const addon = require('addons/content_sensitivity/src/main.js');

// Initialisation
await addon.initialize({
  perspective_api_key: 'your_api_key_here'
});

// Analyse de contenu
const result = await addon.analyzeContent({
  dialogue: "Texte du dialogue à analyser",
  clothing: [{ name: 'T-shirt', culturalSignificance: true, origin: 'France' }],
  context: { origin: 'France' },
  scenario: { text: "Description du scénario", characters: [], settings: {} }
});

console.log(result);
/*
{
  score: 45,
  level: "medium",
  pegi_rating: "PEGI 12",
  content_warnings: ["Violence", "Language"],
  recommendations: ["Log the content for review", "Suggest human review"],
  details: {
    dialogue: { score: 30, flaggedWords: [...] },
    clothing: { score: 10, flaggedItems: [...] },
    scenario: { score: 5, flaggedElements: [...] }
  }
}
*/
```

### Jauge Woke

```javascript
const wokeGauge = require('addons/content_sensitivity/src/woke_gauge.js');

const analysis = wokeGauge.analyzeContent("This text promotes diversity and inclusion");
console.log(analysis.score); // 10
console.log(analysis.level); // "low"
console.log(analysis.color); // "#4CAF50"
console.log(analysis.flaggedTerms); // ["diversity", "inclusion"]
```

## Structure du Projet

```
addons/content_sensitivity/
├── addon.json                    # Manifest de l'addon
├── config/
│   └── schema.json              # Configuration des seuils
├── src/
│   ├── main.js                  # Point d'entrée principal
│   ├── dialogue_analysis.js    # Analyse des dialogues
│   ├── clothing_analysis.js    # Analyse vestimentaire
│   ├── scenario_analysis.js    # Analyse de scénario
│   ├── image_analysis.js       # Analyse d'images
│   ├── keyword_detector.js     # Détection de mots-clés
│   ├── scoring_system.js       # Système de scoring
│   ├── pegi_analysis.js        # Analyse PEGI
│   ├── woke_gauge.js           # Jauge woke/anti-woke
│   └── censorship_mechanisms.js # Mécanismes de censure
└── tests/
    └── test_content_sensitivity.js
```

## Intégration avec les Services Existants

L'addon peut être intégré avec :
- **Perspective API** : Détection avancée de toxicité
- **DeepContentFilter** : Filtrage de contenu personnalisé
- **Services de validation StoryCore** : Hooks `content_filter`, `security_check`

## Extensions Futures

- [ ] Détection d'images NSFW avec classification automatique
- [ ] Support multi-langue (français, allemand, espagnol)
- [ ] Interface utilisateur pour configuration visuelle
- [ ] Export des rapports (PDF, CSV)
- [ ] Intégration avec les pipelines de génération vidéo

## Licence

MIT - Voir le fichier LICENSE pour plus de détails.