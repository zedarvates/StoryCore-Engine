# Story to Scenario Transformer - Implementation Plan (COMPLETED)

## Objectif
Implémenter un module de transformation d'histoire brute en scénario cinématographique structuré JSON.

## Cahier des Charges Référent
- FORMAT : UTF-8
- SORTIE : FICHIER .json STRICTEMENT VALIDE
- Structure : meta, personnages, lieux, objets, sequences, scenes

## Fichiers Créés

### 1. `backend/story_transformer.py` ✓
- **StoryTransformer** - Classe principale d'orchestration
- **StoryAnalyzer** - Extraction pitch, theme, ton, enjeux, personnages, lieux, objets
- **CharacterAnalyzer** - Analyse détaillée des personnages (rôle, objectif, conflit, relations)
- **NarrativeStructureBuilder** - Structure 3 actes
- **SequenceGenerator** - 10 séquences narratives
- **SceneGenerator** - Scènes détaillées (INT/EXT, JOUR/NUIT, actions, dialogues, camera, son)

### 2. `backend/scenario_api.py` ✓
- **POST /api/scenario/transform** - Transformer histoire en scénario
- **GET /api/scenario/{id}** - Récupérer scénario complet
- **GET /api/scenario/{id}/export** - Export JSON/TXT/MD/HTML
- **DELETE /api/scenario/{id}** - Supprimer scénario
- **GET /api/scenario** - Lister tous les scénarios

### 3. `backend/project_builder.py` ✓
- **ProjectBuilder** - Création structure fichiers projet
- **CharacterAsset** - Fiche personnage avec prompt image
- **LocationAsset** - Fiche lieu avec prompt image
- **ObjectAsset** - Fiche objet/artefact
- **PromptAsset** - Prompts pour génération d'images

### 4. `backend/main_api.py` (MODIFIÉ) ✓
- Import du router scenario_api
- Enregistrement du endpoint /api/scenario/*

## Structure de Données de Sortie (DÉTAILLÉE)

### META
```json
{
  "titre": "",
  "pitch": "",
  "theme": "",
  "sous_themes": [],
  "ton": "",
  "ton_precisions": [],
  "enjeux": [],
  "version": "1.0"
}
```

### PERSONNAGES (18 champs)
```json
{
  "id": 1,
  "nom": "Marie",
  "age": "30",
  "role": "protagoniste",
  "description": "",
  "objectif": "",
  "motivation": "",
  "conflit_interne": "",
  "conflit_externe": "",
  "traits": [],
  "forces": [],
  "faiblesses": [],
  "secrets": "",
  "relations": [{"personnage": "", "type": "", "description": ""}],
  "arc_narratif": "",
  "apparitions_scenes": []
}
```

### LIEUX (15 champs)
```json
{
  "id": 1,
  "nom": "Laboratoire",
  "type": "interieur",
  "categorie": "laboratoire",
  "description": "",
  "atmosphere": "",
  "ambiance_sonore": [],
  "elements_visuels": [],
  "eclairage": "jour",
  "historique": "",
  "significance_narrative": "",
  "props": [{"nom": "", "description": "", "utilisation": ""}],
  "apparitions_scenes": []
}
```

### OBJETS (16 champs)
```json
{
  "id": 1,
  "nom": "Document Secret",
  "type": "document",
  "description": "",
  "pouvoir_capacite": "",
  "proprietaire_actuel": "",
  "proprietaire_precedent": "",
  "significance": "",
  "histoire": "",
  "apparitions_scenes": [],
  "utilisation_narrative": ""
}
```

### SÉQUENCES (15 champs)
```json
{
  "id": 1,
  "titre": "L'Ordinaire",
  "acte": 1,
  "objectif": "",
  "lieu_principal": "",
  "lieu_id": 1,
  "moment_journee": "jour",
  "duree_approx": "",
  "personnages": [],
  "personnages_ids": [],
  "resume": "",
  "description_detaillee": "",
  "actions_cles": [],
  "dialogues_cles": [],
  "tension": "moyenne",
  "progression_narrative": "",
  "scenes_ids": []
}
```

### SCÈNES (18 champs)
```json
{
  "id": 1,
  "sequence_id": 1,
  "numero": 1,
  "type": "INT|EXT|MIX",
  "lieu": "",
  "lieu_id": 1,
  "moment": "JOUR|NUIT",
  "duree_estimee": "",
  "description": "",
  "description_visuelle": "",
  "moment_narratif": "introduction|developpement|climax|denouement",
  "actions": [{"ordre": 1, "description": "", "personnages": [], "camera": {}, "dialogues": []}],
  "elements_visuels": [{"type": "", "description": "", "importance": ""}],
  "ambiance_sonore": {"musique": "", "bruitages": [], "silence": false, "intensite": ""},
  "personnagespresents": [{"id": 1, "nom": "", "presence": "", "focalisation": true, "temps_ecran": ""}],
  "progression": {"etat": "", "tension": "", "emotion": "", "information_revelee": ""},
  "liens": {"scene_precedente": 0, "scene_suivante": 2, "type_lien": "continuite"},
  "notes": {"realisation": "", "dialogues": "", "technique": ""}
}
```

## Structure de Fichiers Projet Créés

```
projects/{project_id}/
├── manifest.json              # Manifeste projet
├── scenario.json              # Scénario complet
├── characters/
│   ├── char_001.json         # Fiche personnage
│   └── char_001_prompt.json  # Prompt génération image
├── locations/
│   ├── loc_001.json          # Fiche lieu
│   └── loc_001_prompt.json   # Prompt génération image
├── objects/
│   ├── obj_001.json          # Fiche objet
│   └── obj_001_prompt.json   # Prompt génération image
├── prompts/
│   ├── character_prompts.json
│   ├── location_prompts.json
│   ├── object_prompts.json
│   └── scene_prompts.json
└── images/
    ├── characters/
    ├── locations/
    └── objects/
```

## Découpage Naratif
- **Acte 1**: 3 séquences (Mise en place)
- **Acte 2**: 4 séquences (Confrontation)
- **Acte 3**: 3 séquences (Résolution)
- **Total**: 10 séquences, 20 scènes

## Rôles Narratifs Supportés
- Protagoniste
- Antagoniste
- Mentor
- Allié
- Figurant
- Objet de désir

## Points d'Intégration API
- `POST /api/scenario/transform` - Transformation
- `GET /api/scenario/{id}` - Récupération
- `GET /api/scenario/{id}/export` - Export multi-format
- `GET /api/scenario` - Liste

## Prochaines Étapes (Optionnel)
- [ ] Tests unitaires dans `tests/`
- [ ] Intégration avec ComfyUI pour génération d'images
- [ ] Module de génération de dialogues
- [ ] Module de planification caméra
- [ ] Intégration audio multi-pistes

